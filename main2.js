import { GUI } from './lib/dat.gui.module.js';
import { ResizeSystem } from './common/engine/systems/ResizeSystem.js';
import { UpdateSystem } from './common/engine/systems/UpdateSystem.js';

import { GLTFLoader } from './common/engine/loaders/GLTFLoader.js';
import { UnlitRenderer } from './common/engine/renderers/UnlitRenderer.js';
import { FirstPersonController } from './common/engine/controllers/FirstPersonController.js';

import {
    Camera,
    Material,
    Model,
    Node,
    Primitive,
    Sampler,
    Texture,
    Transform,
} from './common/engine/core.js';

import {
    calculateAxisAlignedBoundingBox,
    mergeAxisAlignedBoundingBoxes,
} from './common/engine/core/MeshUtils.js';

import { Physics } from './Physics.js';

import { Renderer } from './Renderer.js';
import { Light } from './Light.js';

const canvas = document.querySelector('canvas');
//TT const renderer = new UnlitRenderer(canvas);
const renderer = new Renderer(canvas); //TT
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

const light = new Node();
light.addComponent(new Light({
    direction: [0.78, 2.58, 2.8],
    //intensity: 10.0,
}));
scene.addChild(light);

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
    //console.log("Processing Node:", node)
    const model = node.getComponentOfType(Model);
    //console.log(model);
    if (!model) {
        return;
    }

    //console.log("tukaj!");
    const boxes = model.primitives.map(primitive => calculateAxisAlignedBoundingBox(primitive.mesh));
    //console.log(boxes);
    node.aabb = mergeAxisAlignedBoundingBoxes(boxes);
    //console.log(node.nodeIndex);
    //console.log(node.aabb);
});


function getNodeByName(nodeName) {
    // Assuming `scene` is the object containing your nodes
    for (const node of scene.nodes) {
        if (node.name === nodeName) {
            return node;
        }
    }
    return null; // Return null if the node is not found
}

// Assuming you have a function to get a node's current position
function getNodePosition(nodeName) {
    // Assuming you have a function to access a node by name in your scene
    const objekt = scene.getNodeByName(nodeName);

    if (objekt) {
        return objekt.translation;
    } else {
        console.error(`Node not found: ${nodeName}`);
        return null;
    }
}

// Map of tile names to their material indices
const tileMaterialMap = {
    "Circle": 4, // Example, assuming "Circle" uses material index 4
    "Circle.001": 4,
    "Circle.002": 4,
    "Circle.003": 4,
    "Circle.004": 4,
    "Circle.006": 4,
    "Circle.007": 4,
};

// Timers for each tile
const tileTimers = {};
Object.keys(tileMaterialMap).forEach(tile => tileTimers[tile] = 0);

// Function to check if Clyde is above a tile
function isClydeAboveTile(clydePosition, tilePosition, threshold = 1) {
    // Check if Clyde is within a certain distance (threshold) in the 'x' and 'y' axes
    const distanceX = Math.abs(clydePosition[0] - tilePosition[0]);
    const distanceY = Math.abs(clydePosition[1] - tilePosition[1]);

    return distanceX <= threshold && distanceY <= threshold;
}

// Function to change the texture of a tile
function changeTileTexture(tileName, newTextureIndex) {
    const materialIndex = tileMaterialMap[tileName];
    // Modify the material's baseColorTexture
    // Example: materials[materialIndex].pbrMetallicRoughness.baseColorTexture.index = newTextureIndex;
    tile = getNodeByName(tileName);
    
    const meshIndex = tileNode.mesh;
    const mesh = scene.meshes[meshIndex];

    mesh.primitives[0].material = newTextureIndex;

    // mesh.primitives.forEach(primitive => {
    //     const materialIndex = primitive.material;
    //     const material = scene.materials[materialIndex];

    //     if (material && material.pbrMetallicRoughness && material.pbrMetallicRoughness.baseColorTexture) {
    //         material.pbrMetallicRoughness.baseColorTexture.index = newTextureIndex;
    //     } else {
    //         console.error(`Material or texture not found for tile: ${tileName}`);
    //     }
    // });
}

function update(time, dt) {
    scene.traverse(node => {
        for (const component of node.components) {
            component.update?.(time, dt);
        }
    });

    physics.update(time, dt);

    // Ce je Clyde nad tile-om, se spremeni texture tile-a
    const clydePosition = getNodePosition("Clyde");

    Object.keys(tileTimers).forEach(tile => {
        const tilePosition = getNodePosition(tile);
        if (isClydeAboveTile(clydePosition, tilePosition)) {
            tileTimers[tile] += dt;
            if (tileTimers[tile] >= 3) {
                changeTileTexture(tile, 6 /* newTextureIndex */);
                tileTimers[tile] = 0; // Reset the timer
            }
        } else {
            tileTimers[tile] = 0; // Reset if Clyde moves away
        }
    });
}

function render() {
    renderer.render(scene, camera, light);
}

function resize({ displaySize: { width, height }}) {
    camera.getComponentOfType(Camera).aspect = width / height;
}

new ResizeSystem({ canvas, resize }).start();
new UpdateSystem({ update, render }).start();

// const gui = new GUI();
// gui.add(renderer, 'perFragment');

// const lightSettings = light.getComponentOfType(Light);
// const lightFolder = gui.addFolder('Light');
// lightFolder.open();
// lightFolder.addColor(lightSettings, 'color');

// const lightDirection = lightFolder.addFolder('Direction');
// lightDirection.open();
// lightDirection.add(lightSettings.direction, 0, -4, 4).name('x');
// lightDirection.add(lightSettings.direction, 1, -4, 4).name('y');
// lightDirection.add(lightSettings.direction, 2, -4, 4).name('z');
