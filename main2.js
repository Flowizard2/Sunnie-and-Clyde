import { ResizeSystem } from './common/engine/systems/ResizeSystem.js';
import { UpdateSystem } from './common/engine/systems/UpdateSystem.js';

import { GLTFLoader } from './common/engine/loaders/GLTFLoader.js';
import { UnlitRenderer } from './common/engine/renderers/UnlitRenderer.js';
import { FirstPersonController } from './common/engine/controllers/FirstPersonController.js';

import { Camera, Model } from './common/engine/core.js';

import {
    calculateAxisAlignedBoundingBox,
    mergeAxisAlignedBoundingBoxes,
} from './common/engine/core/MeshUtils.js';

import { Physics } from './Physics.js';

const canvas = document.querySelector('canvas');
const renderer = new UnlitRenderer(canvas);
await renderer.initialize();

const loader = new GLTFLoader();
await loader.load('scena.gltf');

const scene = loader.loadScene(loader.defaultScene);
const camera = loader.loadNode('Camera');
camera.addComponent(new FirstPersonController(camera, canvas));
camera.isDynamic = true;
camera.aabb = {
    min: [-0.2, -0.2, -0.2],
    max: [0.2, 0.2, 0.2],
};

// const oblak = loader.loadNode('Oblacek');
// oblak.isDynamic = true;
loader.loadNode('Circle').isStatic = true;
loader.loadNode('Circle.001').isStatic = true;
loader.loadNode('Circle.002').isStatic = true;
loader.loadNode('Circle.003').isStatic = true;
loader.loadNode('Circle.004').isStatic = true;
// loader.loadNode('Tree1').isStatic = true;
// loader.loadNode('Tree1.001').isStatic = true;
loader.loadNode('Tree1.002').isStatic = true;
loader.loadNode('Tree1.003').isStatic = true;
loader.loadNode('Tree1.004').isStatic = true;
// loader.loadNode('Tree1.005').isStatic = true;
// loader.loadNode('Tree2').isStatic = true;
// loader.loadNode('Tree2.001').isStatic = true;
// loader.loadNode('Tree2.002').isStatic = true;

const physics = new Physics(scene);
scene.traverse(node => {
    const model = node.getComponentOfType(Model);
    console.log(model);
    if (!model) {
        return;
    }

    const boxes = model.primitives.map(primitive => calculateAxisAlignedBoundingBox(primitive.mesh));
    node.aabb = mergeAxisAlignedBoundingBoxes(boxes);
    
    console.log(node.aabb);
});

function update(time, dt) {
    scene.traverse(node => {
        for (const component of node.components) {
            component.update?.(time, dt);
        }
    });

    physics.update(time, dt);
}

function render() {
    renderer.render(scene, camera);
}

function resize({ displaySize: { width, height }}) {
    camera.getComponentOfType(Camera).aspect = width / height;
}

new ResizeSystem({ canvas, resize }).start();
new UpdateSystem({ update, render }).start();
