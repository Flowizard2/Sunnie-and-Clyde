import { quat, vec3, vec4, mat3, mat4 } from '../../../lib/gl-matrix-module.js';

export function transformVertex(vertex, matrix,
    normalMatrix = mat3.normalFromMat4(mat3.create(), matrix),
    tangentMatrix = mat3.fromMat4(mat3.create(), matrix),
) {
    vec3.transformMat4(vertex.position, vertex.position, matrix);
    vec3.transformMat3(vertex.normal, vertex.normal, normalMatrix);
    vec3.transformMat3(vertex.tangent, vertex.tangent, tangentMatrix);
}

export function transformMesh(mesh, matrix,
    normalMatrix = mat3.normalFromMat4(mat3.create(), matrix),
    tangentMatrix = mat3.fromMat4(mat3.create(), matrix),
) {
    for (const vertex of mesh.vertices) {
        transformVertex(vertex, matrix, normalMatrix, tangentMatrix);
    }
}

export function calculateAxisAlignedBoundingBox(mesh) {
    if (mesh.vertices.length === 0) {
        console.log("Mesh.vertices length is 0.");
        return null;
    } else {
        console.log("Mesh.vertices length is NOT 0.");
    }
    const initial = {
        min: vec3.clone(mesh.vertices[0].position),
        max: vec3.clone(mesh.vertices[0].position),
    };

    return {
        min: mesh.vertices.reduce((a, b) => vec3.min(a, a, b.position), initial.min),
        max: mesh.vertices.reduce((a, b) => vec3.max(a, a, b.position), initial.max),
    };
}

export function mergeAxisAlignedBoundingBoxes(boxes) {
    if (boxes.length === 0) {
        console.log("Boxes length is 0.");
        return null;
    } else {
        console.log("Boxes length is NOT 0.");
        console.log(boxes);
    }
    
    const initial = {
        min: vec3.clone(boxes[0].min),
        max: vec3.clone(boxes[0].max),
    };

    // return {
    //     min: boxes.reduce(({ min: amin }, { min: bmin }) => vec3.min(amin, amin, bmin), initial),
    //     max: boxes.reduce(({ max: amax }, { max: bmax }) => vec3.max(amax, amax, bmax), initial),
    // };

    // TO SVA SPREMENILA!!
    return {
        min: boxes.reduce((acc, box) => {
            vec3.min(acc.min, acc.min, box.min);
            return acc;
        }, initial).min,
        max: boxes.reduce((acc, box) => {
            vec3.max(acc.max, acc.max, box.max);
            return acc;
        }, initial).max,
    };

}
