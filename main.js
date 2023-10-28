import { GUI } from '../../../lib/dat.gui.module.js';
import { mat4 } from '../../../lib/gl-matrix-module.js';
import { OBJLoader } from '../../../common/engine/loaders/OBJLoader.js';

import {
    Camera,
    Material,
    Model,
    Node,
    Primitive,
    Sampler,
    Texture,
    Transform,
} from '../../../common/engine/core.js';

import * as WebGPU from '../../../common/engine/WebGPU.js';
import { ResizeSystem } from '../../../common/engine/systems/ResizeSystem.js';
import { UpdateSystem } from '../../../common/engine/systems/UpdateSystem.js';
import { ImageLoader } from '../../../common/engine/loaders/ImageLoader.js';
import { JSONLoader } from '../../../common/engine/loaders/JSONLoader.js';
import { UnlitRenderer } from '../../../common/engine/renderers/UnlitRenderer.js';

import { FirstPersonController } from '../../../common/engine/controllers/FirstPersonController.js';

const canvas = document.querySelector('canvas');
const renderer = new UnlitRenderer(canvas);
await renderer.initialize();

const scene = new Node();

const camera = new Node();
camera.addComponent(new Transform({
    translation: [0, 5, 0],
}));
camera.addComponent(new Camera({
    near: 0.1,
    far: 100,
}));
camera.addComponent(new FirstPersonController(camera, canvas));
scene.addChild(camera);



//------------------------------------       moja koda      ------------------------------------

const loader = new OBJLoader();

const model = new Node();
//const mesh = await loader.loadMesh('../../../common/models/monkey.obj');
const mesh = await loader.loadMesh('./oblacek.obj');

model.addComponent(new Transform({
    translation: [0, -1, -5],
}));



const image = await fetch('../../../common/images/grass.png')
    .then(response => response.blob())
    .then(blob => createImageBitmap(blob));

const sampler = new Sampler({
        minFilter: 'nearest',
        magFilter: 'nearest',
});    

const texture = new Texture({ image, sampler });

const material = new Material({ baseTexture: texture });



model.addComponent(new Model({
    primitives: [
        new Primitive({ mesh, material }),
    ],
}));


// const modelTranslation = new Float32Array([0, 5, 0]);
// model.getComponentOfType(Transform).translation = modelTranslation; 


// const modelTranslation2 = new Float32Array([0, 0, 5]);
// camera.getComponentOfType(Transform).translation = modelTranslation2; 

scene.addChild(model);
camera.addChild(model);
model.renderOrder = 1;  // Hana dodala


// Define a variable to track the cloud's position.
const cloudPosition = [0, -1, -5]; // Initial position of the cloud

// ...

// Update the camera's position to follow the cloud.
camera.getComponentOfType(Transform).translation = cloudPosition;

// ...

// Add event listeners for arrow key controls to move the cloud.
document.addEventListener('keydown', (event) => {
    const speed = 0.1; // Adjust the speed as needed
    const cloudTransform = model.getComponentOfType(Transform);
    
    switch (event.key) {
        case 'ArrowUp':
            cloudPosition[2] += speed;
            break;
        case 'ArrowDown':
            cloudPosition[2] -= speed;
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





//------------------------------------   END moja koda      ------------------------------------

const floor = new Node();
floor.addComponent(new Transform({
    scale: [10, 1, 10],
}));
floor.addComponent(new Model({
    primitives: [
        new Primitive({
            mesh: await new JSONLoader().loadMesh('../../../common/models/floor.json'),
            material: new Material({
                baseTexture: new Texture({
                    image: await new ImageLoader().load('../../../common/images/grass.png'),
                    sampler: new Sampler({
                        minFilter: 'nearest',
                        magFilter: 'nearest',
                        addressModeU: 'repeat',
                        addressModeV: 'repeat',
                    }),
                }),
            }),
        }),
    ],
}));
scene.addChild(floor);

function update(t, dt) {
    scene.traverse(node => {
        for (const component of node.components) {
            component.update?.(t, dt);
        }
    });
}

function render() {
    renderer.render(scene, camera);
}

function resize({ displaySize: { width, height }}) {
    camera.getComponentOfType(Camera).aspect = width / height;
}

new ResizeSystem({ canvas, resize }).start();
new UpdateSystem({ update, render }).start();

const gui = new GUI();
const controller = camera.getComponentOfType(FirstPersonController);
gui.add(controller, 'pointerSensitivity', 0.0001, 0.01);
gui.add(controller, 'maxSpeed', 0, 10);
gui.add(controller, 'decay', 0, 1);
gui.add(controller, 'acceleration', 1, 100);
