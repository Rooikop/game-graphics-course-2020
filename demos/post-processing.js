import PicoGL from "../node_modules/picogl/build/module/picogl.js";
import {mat4, vec3, vec4, quat} from "../node_modules/gl-matrix/esm/index.js";

import {positions, normals, indices} from "../blender/cube.js"

let postPositions = new Float32Array([
    0.0, 1.0,
    1.0, 1.0,
    0.0, 0.0,
    1.0, 0.0,
]);

let postIndices = new Uint16Array([
    0, 2, 1,
    2, 3, 1
]);


// language=GLSL
let fragmentShader = `
    #version 300 es
    precision highp float;            
    
    in vec4 color;
    
    out vec4 outColor;       
    
    void main() {                      
        outColor = color;
    }
`;

// language=GLSL
let vertexShader = `
    #version 300 es
    
    uniform vec4 ambientColor;
    uniform vec4 diffuseColor;
    uniform mat4 modelViewMatrix;
    uniform mat4 modelViewProjectionMatrix;
    
    layout(location=0) in vec3 position;
    layout(location=1) in vec3 normal;
    
    out vec4 color;
    
    void main()
    {
        gl_Position = modelViewProjectionMatrix * vec4(position, 1.0);
        vec3 viewNormal = (modelViewMatrix * vec4(normalize(normal), 0.0)).xyz;
        color = diffuseColor * clamp(viewNormal.y, 0.0, 1.0) + ambientColor;
    }
`;

// language=GLSL
let postFragmentShader = `
    #version 300 es
    precision mediump float;
    
    uniform sampler2D tex;
    uniform sampler2D depthTex;
    uniform float time;
    
    in vec4 v_position;
    
    out vec4 outColor;
    
    vec4 depthOfField(vec4 col, float depth, vec2 uv) {
        vec4 blur = vec4(0.0);
        float n = 0.0;
        for (float u = -1.0; u <= 1.0; u += 0.2)    
            for (float v = -1.0; v <= 1.0; v += 0.2) {
                float factor = clamp((depth - 0.992) * 200.0, 0.0, 1.0);
                blur += texture(tex, uv + vec2(u, v) * factor * 0.02);
                n += 1.0;
            }                
        return blur / n;
    }
    
    vec4 ambientOcclusion(vec4 col, float depth, vec2 uv) {
        for (float u = -1.0; u <= 1.0; u += 0.2)    
            for (float v = -1.0; v <= 1.0; v += 0.2) {                
                float diff = abs(depth - texture(depthTex, uv + vec2(u, v) * 0.01).r);                                
                col *= 1.0 - diff * 30.0;
            }
        return col;        
    }   
    
    float random(vec3 seed) {
        return fract(dot(seed, vec3(12.23423, 65.4336, 97.45356)));
    } 
    
    void main() {
        vec4 col = texture(tex, v_position.xy);
        float depth = texture(depthTex, v_position.xy).r;
        
        // Depth of field
        col = depthOfField(col, depth, v_position.xy);
        
        // Ambient Occlusion
        //col = ambientOcclusion(col, depth, v_position.xy);                
        
        // Invert
        //col.rgb = 1.0 - col.rgb;
        
        // Fog
        //col.rgb = col.rgb + vec3((depth - 0.992) * 200.0);
        
        // Noise
        //col.rgb *= random(v_position.xyz * time) * 2.0;                
                        
        outColor = col;
    }
`;

// language=GLSL
let postVertexShader = `
    #version 300 es
    
    layout(location=0) in vec4 position;
    out vec4 v_position;
    
    void main() {
        v_position = position;
        gl_Position = position * 2.0 - 1.0;
    }
`;


let bgColor = vec4.fromValues(0.1, 0.1, 0.1, 1.0);
let fgColor = vec4.fromValues(2.0, 0.9, 0.9, 1.0);
app.clearColor(bgColor[0], bgColor[1], bgColor[2], bgColor[3]);

let program = app.createProgram(vertexShader.trim(), fragmentShader.trim());
let postProgram = app.createProgram(postVertexShader.trim(), postFragmentShader.trim());

let vertexArray = app.createVertexArray()
    .vertexAttributeBuffer(0, app.createVertexBuffer(PicoGL.FLOAT, 3, positions))
    .vertexAttributeBuffer(1, app.createVertexBuffer(PicoGL.FLOAT, 3, normals))
    .indexBuffer(app.createIndexBuffer(PicoGL.UNSIGNED_SHORT, 3, indices));

let postArray = app.createVertexArray()
    .vertexAttributeBuffer(0, app.createVertexBuffer(PicoGL.FLOAT, 2, postPositions))
    .indexBuffer(app.createIndexBuffer(PicoGL.UNSIGNED_SHORT, 3, postIndices));

let colorTarget = app.createTexture2D(app.width, app.height, {magFilter: PicoGL.LINEAR, wrapS: PicoGL.CLAMP_TO_EDGE, wrapR: PicoGL.CLAMP_TO_EDGE});
let depthTarget = app.createTexture2D(app.width, app.height, {format: PicoGL.DEPTH_COMPONENT, type: PicoGL.FLOAT});
let buffer = app.createFramebuffer().colorTarget(0, colorTarget).depthTarget(depthTarget);

let projectionMatrix = mat4.create();
let viewMatrix = mat4.create();
let viewProjMatrix = mat4.create();
let modelViewMatrix = mat4.create();
let modelViewProjectionMatrix = mat4.create();
let modelMatrix = mat4.create();
let modelRotation = quat.create();

let drawCall = app.createDrawCall(program, vertexArray)
    .uniform("ambientColor", bgColor)
    .uniform("diffuseColor", fgColor)
    .uniform("modelViewMatrix", modelViewMatrix)
    .uniform("modelViewProjectionMatrix", modelViewProjectionMatrix);

let postDrawCall = app.createDrawCall(postProgram, postArray)
    .texture("tex", colorTarget)
    .texture("depthTex", depthTarget);

let cameraPosition = vec3.fromValues(0, 0, 8);


let startTime = new Date().getTime() / 1000;

function draw() {
    let time = new Date().getTime() / 1000 - startTime;

    mat4.perspective(projectionMatrix, Math.PI / 8, app.width / app.height, 0.05, 50.0);
    mat4.lookAt(viewMatrix, cameraPosition, vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));
    quat.fromEuler(modelRotation, Math.cos(time * 0.5) * 20 - 90, Math.sin(time * 0.5) * 20, 0)
    mat4.multiply(viewProjMatrix, projectionMatrix, viewMatrix);

    mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
    mat4.multiply(modelViewProjectionMatrix, viewProjMatrix, modelMatrix);

    app.drawFramebuffer(buffer);
    app.viewport(0, 0, colorTarget.width, colorTarget.height);

    app.depthTest().cullBackfaces().clear();

    mat4.fromRotationTranslation(modelMatrix, modelRotation, vec3.fromValues(-1.2, 0, -2));
    mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
    mat4.multiply(modelViewProjectionMatrix, viewProjMatrix, modelMatrix);
    drawCall.draw();
    mat4.fromRotationTranslation(modelMatrix, modelRotation, vec3.fromValues(0, 0, 0));
    mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
    mat4.multiply(modelViewProjectionMatrix, viewProjMatrix, modelMatrix);
    drawCall.draw();
    mat4.fromRotationTranslation(modelMatrix, modelRotation, vec3.fromValues(1.2, 0, 2));
    mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
    mat4.multiply(modelViewProjectionMatrix, viewProjMatrix, modelMatrix);
    drawCall.draw();

    app.defaultDrawFramebuffer();
    app.viewport(0, 0, app.width, app.height);

    app.noDepthTest().drawBackfaces();
    postDrawCall.uniform("time", time);
    postDrawCall.draw();

    requestAnimationFrame(draw);
}
requestAnimationFrame(draw);