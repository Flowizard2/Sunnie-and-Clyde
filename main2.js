import { ResizeSystem } from './common/engine/systems/ResizeSystem.js';
import { UpdateSystem } from './common/engine/systems/UpdateSystem.js';

import { GLTFLoader } from './common/engine/loaders/GLTFLoader.js';
import { UnlitRenderer } from './common/engine/renderers/UnlitRenderer.js';
import { FirstPersonController } from './common/engine/controllers/FirstPersonController.js';

import { Camera, Model, Transform } from './common/engine/core.js';

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
//camera.addComponent(new FirstPersonController(camera, canvas));
camera.isDynamic = true;
camera.aabb = {
    min: [-0.2, -0.2, -0.2],
    max: [0.2, 0.2, 0.2],
};

const oblak = loader.loadNode('Clyde');
oblak.isDynamic = true;
//oblak.addComponent(new FirstPersonController(oblak, canvas));

loader.loadNode('Circle').isStatic = true;
loader.loadNode('Circle.001').isStatic = true;
loader.loadNode('Circle.002').isStatic = true;
loader.loadNode('Circle.003').isStatic = true;
loader.loadNode('Circle.004').isStatic = true;
loader.loadNode('Smreka').isStatic = true;
loader.loadNode('Smreka.001').isStatic = true;
loader.loadNode('Smreka.002').isStatic = true;
loader.loadNode('Smreka.003').isStatic = true;
loader.loadNode('Smreka.004').isStatic = true;
loader.loadNode('Smreka.005').isStatic = true;
loader.loadNode('Listavec').isStatic = true;
loader.loadNode('Listavec.001').isStatic = true;
loader.loadNode('Listavec.002').isStatic = true;


oblak.addComponent(new Transform({
    translation: [0, 0, 0],
}));
const cloudPosition = [0, 0.6935666799545288, 0.9640176892280579];

document.addEventListener('keydown', (event) => {
    const speed = 0.15; // Adjust the speed as needed
    const cloudTransform = oblak.getComponentOfType(Transform);
    
    switch (event.key) {
        case 'ArrowUp':
            cloudPosition[2] -= speed;
            break;
        case 'ArrowDown':
            cloudPosition[2] += speed;
            break;
        case 'ArrowLeft':
            cloudPosition[0] -= speed;
            break;
        case 'ArrowRight':
            cloudPosition[0] += speed;
            break;
    }

    // Update the cloud's position.
    cloudTransform.translation = cloudPosition;
});

const physics = new Physics(scene);
scene.traverse(node => {
    console.log("Processing Node:", node)
    const model = node.getComponentOfType(Model);
    console.log(model);
    if (!model) {
        return;
    }

    console.log("tukaj!");
    const boxes = model.primitives.map(primitive => calculateAxisAlignedBoundingBox(primitive.mesh));
    //console.log(boxes);
    node.aabb = mergeAxisAlignedBoundingBoxes(boxes);
    //console.log(node.nodeIndex);
    //console.log(node.aabb);
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
