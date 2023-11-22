@group(0) @binding(0) var<storage> modelMat: array<mat4x4f>;






// Input vertex attributes
struct VertexInput {
    [[location(0)]] position: vec3<f32>;
};

// Output vertex attributes
struct VertexOutput {
    [[builtin(position)]] position: vec4<f32>;
};

// Uniforms
[[block]]
struct Uniforms {
    lightViewProjectionMatrix: mat4x4<f32>;
};

[[group(0), binding(0)]]
var<uniform> uniforms: Uniforms;

// Main vertex shader
[[stage(vertex)]]
fn mainVertex(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    
    // Transform vertex position to clip space
    output.position = uniforms.lightViewProjectionMatrix * vec4<f32>(input.position, 1.0);
    
    return output;
}

// Main fragment shader
[[stage(fragment)]]
fn mainFragment() -> [[location(0)]] f32 {
    // Output the depth value of the fragment
    return gl_FragCoord.z;
}
