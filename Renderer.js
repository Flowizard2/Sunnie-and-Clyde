import { vec3, mat3, mat4 } from './lib/gl-matrix-module.js';

import * as WebGPU from './common/engine/WebGPU.js';

import { Camera } from './common/engine/core.js';
import { BaseRenderer } from './common/engine/renderers/BaseRenderer.js';

import {
    getLocalModelMatrix,
    getGlobalViewMatrix,
    getProjectionMatrix,
    getModels,
} from './common/engine/core/SceneUtils.js';

import {
    createVertexBuffer,
} from './common/engine/core/VertexUtils.js';

import { Light } from './Light.js';

const vertexBufferLayout = {
    arrayStride: 32,
    attributes: [
        {
            name: 'position',
            shaderLocation: 0,
            offset: 0,
            format: 'float32x3',
        },
        {
            name: 'texcoords',
            shaderLocation: 1,
            offset: 12,
            format: 'float32x2',
        },
        {
            name: 'normal',
            shaderLocation: 2,
            offset: 20,
            format: 'float32x3',
        },
    ],
};

const cameraBindGroupLayout = {
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: {},
        },
    ],
};

const lightBindGroupLayout = {
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: {},
        },
    ],
};

const modelBindGroupLayout = {
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: {},
        },
    ],
};

const materialBindGroupLayout = {
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {},
        },
        {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {},
        },
        {
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT,
            sampler: {},
        },
    ],
};

export class Renderer extends BaseRenderer {

    constructor(canvas) {
        super(canvas);
        this.perFragment = true;
    }
    

    async initialize() {
        await super.initialize();

        const codePerFragment = await fetch('lambertPerFragment.wgsl').then(response => response.text());
        const codePerVertex = await fetch('lambertPerVertex.wgsl').then(response => response.text());

        //Koda za shadowmapping shader
        const codeForShadow = await fetch('shadow-depth.wgsl').then(response=> response.text());

        const modulePerFragment = this.device.createShaderModule({ code: codePerFragment });
        const modulePerVertex = this.device.createShaderModule({ code: codePerVertex });

        this.cameraBindGroupLayout = this.device.createBindGroupLayout(cameraBindGroupLayout);
        this.lightBindGroupLayout = this.device.createBindGroupLayout(lightBindGroupLayout);
        this.modelBindGroupLayout = this.device.createBindGroupLayout(modelBindGroupLayout);
        this.materialBindGroupLayout = this.device.createBindGroupLayout(materialBindGroupLayout);

        const layout = this.device.createPipelineLayout({
            bindGroupLayouts: [
                this.cameraBindGroupLayout,
                this.lightBindGroupLayout,
                this.modelBindGroupLayout,
                this.materialBindGroupLayout,
            ],
        });

        this.pipelinePerFragment = await this.device.createRenderPipelineAsync({
            vertex: {
                module: modulePerFragment,
                entryPoint: 'vertex',
                buffers: [ vertexBufferLayout ],
            },
            fragment: {
                module: modulePerFragment,
                entryPoint: 'fragment',
                targets: [{ format: this.format }],
            },
            depthStencil: {
                format: 'depth24plus',
                depthWriteEnabled: true,
                depthCompare: 'less',
            },
            layout,
        });

        this.pipelinePerVertex = await this.device.createRenderPipelineAsync({
            vertex: {
                module: modulePerVertex,
                entryPoint: 'vertex',
                buffers: [ vertexBufferLayout ],
            },
            fragment: {
                module: modulePerVertex,
                entryPoint: 'fragment',
                targets: [{ format: this.format }],
            },
            depthStencil: {
                format: 'depth24plus',
                depthWriteEnabled: true,
                depthCompare: 'less',
            },
            layout,
        });

        this.recreateDepthTexture();
    }

    recreateDepthTexture() {
        this.depthTexture?.destroy();
        this.depthTexture = this.device.createTexture({
            format: 'depth24plus',
            size: [this.canvas.width, this.canvas.height],
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
    }



    prepareNode(node) {
        if (this.gpuObjects.has(node)) {
            return this.gpuObjects.get(node);
        }

        const modelUniformBuffer = this.device.createBuffer({
            size: 128,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const modelBindGroup = this.device.createBindGroup({
            layout: this.modelBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: modelUniformBuffer } },
            ],
        });

        const gpuObjects = { modelUniformBuffer, modelBindGroup };
        this.gpuObjects.set(node, gpuObjects);
        return gpuObjects;
    }

    prepareCamera(camera) {
        if (this.gpuObjects.has(camera)) {
            return this.gpuObjects.get(camera);
        }

        const cameraUniformBuffer = this.device.createBuffer({
            size: 128,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const cameraBindGroup = this.device.createBindGroup({
            layout: this.cameraBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: cameraUniformBuffer } },
            ],
        });

        const gpuObjects = { cameraUniformBuffer, cameraBindGroup };
        this.gpuObjects.set(camera, gpuObjects);
        return gpuObjects;
    }

    prepareLight(light) {
        if (this.gpuObjects.has(light)) {
            return this.gpuObjects.get(light);
        }

        const lightUniformBuffer = this.device.createBuffer({
            size: 32,//36,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const lightBindGroup = this.device.createBindGroup({
            layout: this.lightBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: lightUniformBuffer } },
            ],
        });

        const gpuObjects = { lightUniformBuffer, lightBindGroup };
        this.gpuObjects.set(light, gpuObjects);
        return gpuObjects;
    }

    prepareMaterial(material) {
        if (this.gpuObjects.has(material)) {
            return this.gpuObjects.get(material);
        }

        const baseTexture = this.prepareImage(material.baseTexture.image).gpuTexture;
        const baseSampler = this.prepareSampler(material.baseTexture.sampler).gpuSampler;

        const materialUniformBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const materialBindGroup = this.device.createBindGroup({
            layout: this.materialBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: materialUniformBuffer } },
                { binding: 1, resource: baseTexture.createView() },
                { binding: 2, resource: baseSampler },
            ],
        });

        const gpuObjects = { materialUniformBuffer, materialBindGroup };
        this.gpuObjects.set(material, gpuObjects);
        return gpuObjects;
    }

    // renderShadows(scene, light) {
 
    // // Step 1: Create a depth texture and a framebuffer for rendering the depth map
    // const depthTexture = this.device.createTexture({
    //     size: { width: 2048, height: 2048, depth: 1 },
    //     format: 'depth24plus',
    //     usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.SAMPLED
    // });

    // const depthTextureView = depthTexture.createView();

    // // Step 2: Create a depth render pass descriptor
    // const depthRenderPassDescriptor = {
    //     colorAttachments: [],
    //     depthStencilAttachment: {
    //         view: depthTextureView,
    //         depthLoadValue: 1.0,
    //         depthStoreOp: 'store',
    //         stencilLoadValue: 'load',
    //         stencilStoreOp: 'store',
    //     },
    // };

    // // Step 3: Create a depth render pipeline
    // const depthRenderPipeline = this.device.createRenderPipeline({
    //     layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.cameraBindGroupLayout] }),
    //     vertex: {
    //         module: this.device.createShaderModule({ code: codeForShadow }),
    //         entryPoint: 'main',
    //     },
    //     fragment: {
    //         module: this.device.createShaderModule({ code: codeForShadow }),
    //         entryPoint: 'main',
    //         targets: [],
    //     },
    //     depthStencil: {
    //         format: 'depth24plus',
    //         depthWriteEnabled: true,
    //         depthCompare: 'less',
    //     },
    //     primitive: {
    //         topology: 'triangle-list',
    //     },
    // });

    // // Step 4: Create a bind group for the depth rendering
    // const depthBindGroup = this.device.createBindGroup({
    //     layout: depthRenderPipeline.getBindGroupLayout(0),
    //     entries: [
    //         { binding: 0, resource: this.cameraUniformBuffer },
    //     ],
    // });

    // // Step 5: Render the depth map and use it in your main rendering pass
    // const commandEncoder = this.device.createCommandEncoder();
    // const depthPass = commandEncoder.beginRenderPass(depthRenderPassDescriptor);
    // depthPass.setPipeline(depthRenderPipeline);
    // depthPass.setBindGroup(0, depthBindGroup);
    // depthPass.draw(3, 1, 0, 0);
    // depthPass.endPass();

    // this.device.queue.submit([commandEncoder.finish()]);
        
    // }

    render(scene, camera, light) {
        if (this.depthTexture.width !== this.canvas.width || this.depthTexture.height !== this.canvas.height) {
            this.recreateDepthTexture();
        }

        const encoder = this.device.createCommandEncoder();
        this.renderPass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.context.getCurrentTexture().createView(),
                    clearValue: [1, 1, 1, 1],
                    loadOp: 'clear',
                    storeOp: 'store',
                }
            ],
            depthStencilAttachment: {
                view: this.depthTexture.createView(),
                depthClearValue: 1,
                depthLoadOp: 'clear',
                depthStoreOp: 'discard',
            },
        });
        this.renderPass.setPipeline(this.perFragment ? this.pipelinePerFragment : this.pipelinePerVertex);

        const cameraComponent = camera.getComponentOfType(Camera);
        const viewMatrix = getGlobalViewMatrix(camera);
        const projectionMatrix = getProjectionMatrix(camera);
        const { cameraUniformBuffer, cameraBindGroup } = this.prepareCamera(cameraComponent);
        this.device.queue.writeBuffer(cameraUniformBuffer, 0, viewMatrix);
        this.device.queue.writeBuffer(cameraUniformBuffer, 64, projectionMatrix);
        this.renderPass.setBindGroup(0, cameraBindGroup);

        const lightComponent = light.getComponentOfType(Light);
        const lightColor = vec3.scale(vec3.create(), lightComponent.color, 1 / 255);
        const lightDirection = vec3.normalize(vec3.create(), lightComponent.direction);
        //const lightIntensity = new Float32Array([lightComponent.intensity]);

        const { lightUniformBuffer, lightBindGroup } = this.prepareLight(lightComponent);
        this.device.queue.writeBuffer(lightUniformBuffer, 0, lightColor);
        this.device.queue.writeBuffer(lightUniformBuffer, 16, lightDirection);
        //this.device.queue.writeBuffer(lightUniformBuffer, 32, lightIntensity);

        this.renderPass.setBindGroup(1, lightBindGroup);

        this.renderNode(scene);

        this.renderPass.end();
        this.device.queue.submit([encoder.finish()]);
    }

    renderNode(node, modelMatrix = mat4.create()) {
        const localMatrix = getLocalModelMatrix(node);
        modelMatrix = mat4.multiply(mat4.create(), modelMatrix, localMatrix);

        const { modelUniformBuffer, modelBindGroup } = this.prepareNode(node);
        const normalMatrix = this.mat3tomat4(mat3.normalFromMat4(mat3.create(), modelMatrix));
        this.device.queue.writeBuffer(modelUniformBuffer, 0, modelMatrix);
        this.device.queue.writeBuffer(modelUniformBuffer, 64, normalMatrix);
        this.renderPass.setBindGroup(2, modelBindGroup);

        for (const model of getModels(node)) {
            this.renderModel(model);
        }

        for (const child of node.children) {
            this.renderNode(child, modelMatrix);
        }
    }

    renderModel(model) {
        for (const primitive of model.primitives) {
            this.renderPrimitive(primitive);
        }
    }

    renderPrimitive(primitive) {
        const { materialUniformBuffer, materialBindGroup } = this.prepareMaterial(primitive.material);
        this.device.queue.writeBuffer(materialUniformBuffer, 0, new Float32Array(primitive.material.baseFactor));
        this.renderPass.setBindGroup(3, materialBindGroup);

        const { vertexBuffer, indexBuffer } = this.prepareMesh(primitive.mesh, vertexBufferLayout);
        this.renderPass.setVertexBuffer(0, vertexBuffer);
        this.renderPass.setIndexBuffer(indexBuffer, 'uint32');

        this.renderPass.drawIndexed(primitive.mesh.indices.length);
    }

}
