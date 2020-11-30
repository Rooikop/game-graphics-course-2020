import PicoGL from "../node_modules/picogl/build/module/picogl.js";
import {mat4, vec3, vec4} from "../node_modules/gl-matrix/esm/index.js";

// *********************************************************************************************************************
// **                                                                                                                 **
// **                  This is an example of simplistic forward rendering technique using WebGL                       **
// **                                                                                                                 **
// *********************************************************************************************************************

// Home task: change anything you like in this small demo, be creative and make it look cool ;)
// * You can change 3D cube model with any other mesh using Blender WebGL export addon, check blender/export_webgl.py
// * Change object and camera transformations inside draw() function
// * Change colors using bgColor and fgColor variables
// * Distort object shape inside vertexShader
// * Distort object colors inside fragmentShader

// ******************************************************
// **                       Data                       **
// ******************************************************

const positions = new Float32Array([
    // front
    0.6, -0.7, -0.4,
    0.6, 0.7, 0.4,
    -0.6, 0.7, -0.4,
    -0.6, -0.7, 0.4,

    // back
    0.6, -0.7, 0.4,
    0.6, 0.7, -0.4,
    -0.6, 0.7, 0.4,
    -0.6, -0.7, -0.4,

    //top
    0.6, -0.7, -0.4,
    0.6, 0.7, 0.4,
    -0.6, -0.7, 0.4,
    -0.6, 0.7, -0.4,

    //bottom
    0.6, 0.7, -0.4,
    0.6, -0.7, 0.4,
    -0.6, 0.7, 0.4,
    -0.6, -0.7, -0.4,

    //left
    0.6, 0.7, -0.4,
    -0.6, 0.7, 0.4,
    0.6, -0.7, 0.4,
    -0.6, -0.7, -0.4,

    //right
    -0.6, 0.7, -0.4,
    0.6, 0.7, 0.4,
    -0.6, -0.7, 0.4,
    0.6, -0.7, -0.4,
]);

const normals = new Float32Array([
    // front
    0.2, 0.2, 3.0,
    0.2, 0.2, 3.0,
    0.2, 0.2, 3.0,
    0.2, 0.2, 3.0,

    // back
    0.2, 0.2, -3.0,
    0.2, 0.2, -3.0,
    0.2, 0.2, -3.0,
    0.2, 0.2, -3.0,

    //top
    0.2, 3.0, 0.2,
    0.2, 3.0, 0.2,
    0.2, 3.0, 0.2,
    0.2, 3.0, 0.2,

    //bottom
    0.2, -3.0, 0.2,
    0.2, -3.0, 0.2,
    0.2, -3.0, 0.2,
    0.2, -3.0, 0.2,

    //left
    -3.0, 0.2, 0.2,
    -3.0, 0.2, 0.2,
    -3.0, 0.2, 0.2,
    -3.0, 0.2, 0.2,,

    //right
    3.0, 0.2, 0.2,
    3.0, 0.2, 0.2,
    3.0, 0.2, 0.2,
    3.0, 0.2, 0.2,
]);

const indices = new Uint16Array([
    // front
    2, 1, 0,
    0, 3, 2,

    // back
    4, 5, 6,
    6, 7, 4,

    // top
    8, 9, 10,
    10, 11, 8,

    // bottom
    14, 13, 12,
    12, 15, 14,

    // left
    16, 17, 18,
    18, 19, 16,

    // right
    22, 21, 20,
    20, 23, 22,
]);

// import {positions, normals, indices} from "../blender/torus.js"


// ******************************************************
// **                 Pixel processing                 **
// ******************************************************

// language=GLSL
let fragmentShader = `
    #version 300 es
    precision highp float;
    
    in vec4 color;
    
    out vec4 outColor;
    
    void main()
    {
        outColor = color;
    }
`;


// ******************************************************
// **               Geometry processing                **
// ******************************************************

// language=GLSL
let vertexShader = `
    #version 300 es
    
    uniform float time;
    uniform vec4 bgColor;
    uniform vec4 fgColor;
    uniform mat4 modelViewMatrix;
    uniform mat4 modelViewProjectionMatrix;
    
    layout(location=0) in vec3 position;
    layout(location=1) in vec3 normal;
    
    out vec4 color;
    
    void main()
    {
        gl_Position = modelViewProjectionMatrix * vec4(position, 4.0);
        vec3 viewNormal = (modelViewMatrix * vec4(normal, 0.0)).xyz;
        color = mix(bgColor * 0.8, fgColor, viewNormal.z) + pow(viewNormal.z, 20.0);
    }
`;


// ******************************************************
// **             Application processing               **
// ******************************************************

let bgColor = vec4.fromValues(0.2, 0.7, 0.7, 0.3);
let fgColor = vec4.fromValues(0.1, 0.0, 0.1, 0.0);


app.clearColor(bgColor[0], bgColor[1], bgColor[2], bgColor[3])
    .enable(PicoGL.DEPTH_TEST)
    .enable(PicoGL.CULL_FACE);

let program = app.createProgram(vertexShader.trim(), fragmentShader.trim());

let vertexArray = app.createVertexArray()
    .vertexAttributeBuffer(0, app.createVertexBuffer(PicoGL.FLOAT, 3, positions))
    .vertexAttributeBuffer(1, app.createVertexBuffer(PicoGL.FLOAT, 3, normals))
    .indexBuffer(app.createIndexBuffer(PicoGL.UNSIGNED_SHORT, 3, indices));

let projMatrix = mat4.create();
let viewMatrix = mat4.create();
let viewProjMatrix = mat4.create();
let modelMatrix = mat4.create();
let modelViewMatrix = mat4.create();
let modelViewProjectionMatrix = mat4.create();
let rotateXMatrix = mat4.create();
let rotateYMatrix = mat4.create();

let drawCall = app.createDrawCall(program, vertexArray)
    .uniform("bgColor", bgColor)
    .uniform("fgColor", fgColor);

let startTime = new Date().getTime() / 2500;



function draw() {
    let time = new Date().getTime() / 2500 - startTime;

    mat4.perspective(projMatrix, Math.PI / 8, app.width / app.height, 1, 500.0);
    mat4.lookAt(viewMatrix, vec3.fromValues(7, 3, 6), vec3.fromValues(4, 2, 4), vec3.fromValues(3, 1, 9));
    mat4.multiply(viewProjMatrix, projMatrix, viewMatrix);

    mat4.fromXRotation(rotateXMatrix, time * 0.1136);
    mat4.fromYRotation(rotateYMatrix, time * 0.2235);
    mat4.multiply(modelMatrix, rotateXMatrix, rotateYMatrix);

    mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
    mat4.multiply(modelViewProjectionMatrix, viewProjMatrix, modelMatrix);

    drawCall.uniform("time", time);
    drawCall.uniform("modelViewMatrix", modelViewMatrix);
    drawCall.uniform("modelViewProjectionMatrix", modelViewProjectionMatrix);

    app.clear();
    drawCall.draw();

    requestAnimationFrame(draw);
    
}
requestAnimationFrame(draw);
