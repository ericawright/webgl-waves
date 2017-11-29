"use strict"

// utility Functions

function resizeCanvasToDisplaySize(canvas, multiplier) {
  multiplier = multiplier || 1;
  var width  = canvas.clientWidth  * multiplier | 0;
  var height = canvas.clientHeight * multiplier | 0;
  if (canvas.width !== width ||  canvas.height !== height) {
    canvas.width  = width;
    canvas.height = height;
    return true;
  }
  return false;
}

function createProgram(gl, vertexShader, fragmentShader) {
  // create a program.
  var program = gl.createProgram();

  // attach the shaders.
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  // link the program.
  gl.linkProgram(program);

  // Check if it linked.
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!success) {
      // something went wrong with the link
      throw ("program failed to link:" + gl.getProgramInfoLog (program));
  }

  return program;
};

function compileShader(gl, shaderSource, shaderType) {
  // Create the shader object
  var shader = gl.createShader(shaderType);

  // Set the shader source code.
  gl.shaderSource(shader, shaderSource);

  // Compile the shader
  gl.compileShader(shader);

  // Check if it compiled
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    // Something went wrong during compilation; get the error
    throw "could not compile shader:" + gl.getShaderInfoLog(shader);
  }

  return shader;
}

function createShaderFromScript(gl, scriptId, opt_shaderType) {
  // look up the script tag by id.
  var shaderScript = document.getElementById(scriptId);
  if (!shaderScript) {
    throw("*** Error: unknown script element" + scriptId);
  }

  // extract the contents of the script tag.
  var shaderSource = shaderScript.text;

  // If we didn't pass in a type, use the 'type' from
  // the script tag.
  if (!opt_shaderType) {
    if (shaderScript.type == "x-shader/x-vertex") {
      opt_shaderType = gl.VERTEX_SHADER;
    } else if (shaderScript.type == "x-shader/x-fragment") {
      opt_shaderType = gl.FRAGMENT_SHADER;
    } else if (!opt_shaderType) {
      throw("*** Error: shader type not set");
    }
  }

  return compileShader(gl, shaderSource, opt_shaderType);
};

function createProgramFromScripts(
    gl, shaderScriptIds) {
  var vertexShader = createShaderFromScript(gl, shaderScriptIds[0], gl.VERTEX_SHADER);
  gl.compileShader(vertexShader);
  if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.error('error compiling vertex shader', gl.getShaderInfoLog(vertexShader));
    return;
  }

  var fragmentShader = createShaderFromScript(gl, shaderScriptIds[1], gl.FRAGMENT_SHADER);
  gl.compileShader(fragmentShader);
  if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.error('error compiling frag shader', gl.getShaderInfoLog(fragmentShader));
    return;
  }

  return createProgram(gl, vertexShader, fragmentShader);
}



// start
function InitDemo() {
  console.log('init');
  var images = [];
  var urls = [
    "wave1a.png",
    "wave2a.png",
    "wave3b.png",
    "wave4a.png",
    "wave5a.png",
    "wave6a.png",
    "wave7a.png",
    "wave8a.png"
  ];
  var imagesToLoad = urls.length;

  function loadImage(url, callback) {
    var image = new Image();
    image.src = url;
    image.width = "2048";
    image.height = "2048";
    image.onload = callback;
    return image;
  }
  var onImageLoad = function() {
    --imagesToLoad;
    // If all the images are loaded call the callback.
    if (imagesToLoad == 0) {
      render(images);
    }
  };
  
  for (var i = 0; i < urls.length; ++i) {
    var image = loadImage(urls[i], onImageLoad);
    images.push(image);
  }

}

function render(images) {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  var canvas = document.getElementById("canvas");
  var gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  // setup GLSL program
  var program = createProgramFromScripts(gl, ["2d-vertex-shader", "2d-fragment-shader"]);
  var spinProgram = createProgramFromScripts(gl, ["2d-vertex-shader-spin", "2d-fragment-shader"]);

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, "a_position");
  var texcoordLocation = gl.getAttribLocation(program, "a_texCoord");

  // Create a buffer to put three 2d clip space points in
  var positionBuffer = gl.createBuffer();

  // Bind it to ARRAY_BUFFER
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  
  // Set a rectangle the same size as the canvas.
  setRectangle(gl, 0, 0, canvas.clientWidth, canvas.clientHeight);

  // provide texture coordinates for the rectangle.
  var texcoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0.0,  0.0,
      1.0,  0.0,
      0.0,  1.0,
      0.0,  1.0,
      1.0,  0.0,
      1.0,  1.0,
  ]), gl.STATIC_DRAW);
  
  var textures = [];
  images.forEach((image) => {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // Upload the image into the texture.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // add the texture to the array of textures.
    textures.push(texture);
  });

  // lookup uniforms
  var resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  var initialXLocation = gl.getUniformLocation(program, "u_x_coord");
  var initialYLocation = gl.getUniformLocation(program, "u_y_coord");
  var xScaleBaseLocation = gl.getUniformLocation(program, "u_x_scale_base");
  var yScaleBaseLocation = gl.getUniformLocation(program, "u_y_scale_base");
  var xScaleVarienceLocation = gl.getUniformLocation(program, "u_x_scale_varience");
  var yScaleVarienceLocation = gl.getUniformLocation(program, "u_y_scale_varience");
  var xSkewVarienceLocation = gl.getUniformLocation(program, "u_x_skew_varience");
  var ySkewVarienceLocation = gl.getUniformLocation(program, "u_y_skew_varience");
  var xTranslateLocation = gl.getUniformLocation(program, "u_x_translate");
  var yTranslateLocation = gl.getUniformLocation(program, "u_y_translate");
  
  resizeCanvasToDisplaySize(gl.canvas);

  // Tell WebGL how to convert from clip space to pixels
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Clear the canvas
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Tell it to use our program (pair of shaders)
  gl.useProgram(program);
  // 
  // gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  gl.enable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);


  gl.enableVertexAttribArray(positionLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  var size = 2;          // 2 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
      positionLocation, size, type, normalize, stride, offset);

  gl.enableVertexAttribArray(texcoordLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);

  // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  var size = 2;          // 2 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
      texcoordLocation, size, type, normalize, stride, offset);

  // set the resolution
  gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);

  // Draw the rectangle.
  var primitiveType = gl.TRIANGLES;
  var offset = 0;
  var count = 6;

  var timeLocation = gl.getUniformLocation(program, "u_time");
  
  function buildImages(time, movement) {
    gl.bindTexture(gl.TEXTURE_2D, textures[movement.texture]);
    gl.uniform1f(xScaleBaseLocation, movement.xScaleBase);
    gl.uniform1f(yScaleBaseLocation, movement.yScaleBase);
    gl.uniform1f(xScaleVarienceLocation, movement.xScaleVarience);
    gl.uniform1f(yScaleVarienceLocation, movement.yScaleVarience);
    gl.uniform1f(xSkewVarienceLocation, movement.xSkewVarience);
    gl.uniform1f(ySkewVarienceLocation, movement.ySkewVarience);
    gl.uniform1f(initialXLocation, movement.initialX);
    gl.uniform1f(initialYLocation, movement.initialY);
    gl.uniform1f(xTranslateLocation, movement.translateX);
    gl.uniform1f(yTranslateLocation, movement.translateY);
    gl.uniform1f(timeLocation, ((time * movement.speed) + movement.delay) % movement.period);
    gl.drawArrays(primitiveType, offset, count);
  }
  
  let wave1Movement = {
    xScaleBase: 1.45,
    yScaleBase: 1.5,
    xScaleVarience: 0.1,
    yScaleVarience: 0.1,
    xSkewVarience: 0.0,
    ySkewVarience: 0.0,
    initialX: 0.0,
    initialY: 0.1,
    translateX: 0.0,
    translateY: 0.0,
    delay: 0.0,
    speed: 0.0015,
    texture: 0,
    period: 11,
    
    spin_delay: -2.0,
    spin_radians: 3.0,
    spin_translateX: 0.8,
    spin_translateY: 1.1,
    spin_speed: 0.002,
  }
  let wave2Movement = {
    xScaleBase: 1.4,
    yScaleBase: 1.3,
    xScaleVarience: 0.1,
    yScaleVarience: 0.1,
    xSkewVarience: 0.0,
    ySkewVarience: 0.0,
    initialX: 0.0,
    initialY: -0.3,
    translateX: 0.0,
    translateY: 0.0,
    delay: 0.0,
    speed: 0.0016,
    texture: 1,
    period: 11,
    
    spin_delay: -1.0,
    spin_radians: 3.0,
    spin_translateX: 0.0,
    spin_translateY: 0.4,
    spin_speed: 0.0028,
  }
  let wave3Movement = {
    xScaleBase: 1.3,
    yScaleBase: 0.6,
    xScaleVarience: 0.2,
    yScaleVarience: 0.0,
    xSkewVarience: 0.3,
    ySkewVarience: 0.0,
    initialX: 0.0,
    initialY: -0.5,
    translateX: 0.0,
    translateY: 0.0,
    delay: 0.0,
    speed: 0.0011,
    texture: 2,
    period: 11,
    
    spin_delay: -1.0,
    spin_radians: 3.0,
    spin_translateX: 0.1,
    spin_translateY: 0.5,
    spin_speed: 0.0027,
  }
  let wave4Movement = {
    xScaleBase: 1.3,
    yScaleBase: 1.2,
    xScaleVarience: 0.0,
    yScaleVarience: -0.1,
    xSkewVarience: -0.1,
    ySkewVarience: 0.0,
    initialX: 0.0,
    initialY: -0.8,
    translateX: 0.0,
    translateY: 0.0,
    delay: 0.0,
    speed: 0.00018,
    texture: 3,
    period: 11,
    
    spin_delay: -1.0,
    spin_radians: 3.0,
    spin_translateX: -0.4,
    spin_translateY: 0.0,
    spin_speed: 0.0026,
  }
  
  let wave5Movement = {
    xScaleBase: 1.7,
    yScaleBase: 0.5,
    xScaleVarience: -0.2,
    yScaleVarience: 0.1,
    xSkewVarience: 0.3,
    ySkewVarience: 0.0,
    initialX: 0.15,
    initialY: 0.15,
    translateX: 0.0,
    translateY: -0.1,
    delay: 0.0,
    speed: 0.0005,
    texture: 4,
    period: (4 * Math.PI),
    
    spin_delay: -1.0,
    spin_radians: 4.0,
    spin_translateX: -0.4,
    spin_translateY: -0.4,
    spin_speed: 0.002,
  }
  
  let wave6Movement = {
    xScaleBase: 1.5,
    yScaleBase: 1.3,
    xScaleVarience: 0.15,
    yScaleVarience: 0.15,
    xSkewVarience: 0.2,
    ySkewVarience: 0.0,
    initialX: 0.0,
    initialY: 0.4,
    translateX: 0.0,
    translateY: 0.0,
    delay: 0.0,
    speed: 0.00048,
    texture: 5,
    period: (4 * Math.PI),
    
    spin_delay: -1.0,
    spin_radians: 3.0,
    spin_translateX: -0.5,
    spin_translateY: -0.6,
    spin_speed: 0.0023,
  }
  
  let wave7Movement = {
    xScaleBase: 0.8,
    yScaleBase: 1.0,
    xScaleVarience: 0.1,
    yScaleVarience: 0.25,
    xSkewVarience: 0.15,
    ySkewVarience: 0.0,
    initialX: 0.3,
    initialY: 0.4,
    translateX: 0.0,
    translateY: 0.0,
    delay: 0.0,
    speed: 0.0006,
    texture: 6,
    period: (4 * Math.PI),
    
    spin_delay: -1.0,
    spin_radians: 3.0,
    spin_translateX: 0.0,
    spin_translateY: -0.6,
    spin_speed: 0.003,
  }
  
  let wave8Movement = {
    xScaleBase: 1.5,
    yScaleBase: 0.8,
    xScaleVarience: 0.0,
    yScaleVarience: -0.05,
    xSkewVarience: 0.2,
    ySkewVarience: 0.0,
    initialX: -0.11,
    initialY: 0.3,
    translateX: 0.0,
    translateY: 0.0,
    delay: 0.0,
    speed: 0.00051,
    texture: 7,
    period: (4 * Math.PI),
    
    spin_delay: -1.0,
    spin_radians: 4.5,
    spin_translateX: 0.5,
    spin_translateY: 0.0,
    spin_speed: 0.002,
  }
  
  var myReq;
  var oldTime = 0;
  var waveStartTime = performance.now();
  var waveDeltaTime = 0;

  function animate(time) {
    waveDeltaTime = time - waveStartTime;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    buildImages(waveDeltaTime, wave1Movement);
    buildImages(waveDeltaTime, wave2Movement);
    buildImages(waveDeltaTime, wave3Movement);
    buildImages(waveDeltaTime, wave4Movement);
    buildImages(waveDeltaTime, wave5Movement);
    buildImages(waveDeltaTime, wave6Movement);
    buildImages(waveDeltaTime, wave7Movement);
    buildImages(waveDeltaTime, wave8Movement);
  
     myReq = window.requestAnimationFrame(animate);
  }
  
  animate(performance.now);

  // Change to rotation/spin shaders on keypress
  function handleKeyUp () {
    gl.useProgram(spinProgram);

    var spinResolutionLocation = gl.getUniformLocation(spinProgram, "u_resolution");
    var spinTimeLocation = gl.getUniformLocation(spinProgram, "u_time");
    var spinDegreesLocation = gl.getUniformLocation(spinProgram, "u_degrees");
    var spinXTranslateLocation = gl.getUniformLocation(spinProgram, "u_x_spin_translate");
    var spinYTranslateLocation = gl.getUniformLocation(spinProgram, "u_y_spin_translate");
    var endTimeLocation = gl.getUniformLocation(spinProgram, "u_old_end_time");
    
    var resolutionLocation = gl.getUniformLocation(spinProgram, "u_resolution");
    var initialXLocation = gl.getUniformLocation(spinProgram, "u_x_coord");
    var initialYLocation = gl.getUniformLocation(spinProgram, "u_y_coord");
    var xScaleBaseLocation = gl.getUniformLocation(spinProgram, "u_x_scale_base");
    var yScaleBaseLocation = gl.getUniformLocation(spinProgram, "u_y_scale_base");
    var xScaleVarienceLocation = gl.getUniformLocation(spinProgram, "u_x_scale_varience");
    var yScaleVarienceLocation = gl.getUniformLocation(spinProgram, "u_y_scale_varience");
    var xSkewVarienceLocation = gl.getUniformLocation(spinProgram, "u_x_skew_varience");
    var ySkewVarienceLocation = gl.getUniformLocation(spinProgram, "u_y_skew_varience");
    var xTranslateLocation = gl.getUniformLocation(spinProgram, "u_x_translate");
    var yTranslateLocation = gl.getUniformLocation(spinProgram, "u_y_translate");
    
    gl.uniform2f(spinResolutionLocation, gl.canvas.width, gl.canvas.height);
    
    function drawWaveSpin (time, movement) {
      console.log("wavedelta time: ", waveDeltaTime)
      // wave uniforms
      gl.uniform1f(xScaleBaseLocation, movement.xScaleBase);
      gl.uniform1f(yScaleBaseLocation, movement.yScaleBase);
      gl.uniform1f(xScaleVarienceLocation, movement.xScaleVarience);
      gl.uniform1f(yScaleVarienceLocation, movement.yScaleVarience);
      gl.uniform1f(xSkewVarienceLocation, movement.xSkewVarience);
      gl.uniform1f(ySkewVarienceLocation, movement.ySkewVarience);
      gl.uniform1f(initialXLocation, movement.initialX);
      gl.uniform1f(initialYLocation, movement.initialY);
      gl.uniform1f(xTranslateLocation, movement.translateX);
      gl.uniform1f(yTranslateLocation, movement.translateY);
      
      //s pin uniforms
      gl.uniform1f(spinXTranslateLocation, movement.spin_translateX);
      gl.uniform1f(spinYTranslateLocation, movement.spin_translateY);
      gl.uniform1f(spinDegreesLocation, movement.spin_radians);
      gl.uniform1f(endTimeLocation, ((waveDeltaTime * movement.speed) + movement.delay) % movement.period);
      
      gl.uniform1f(spinTimeLocation, (time * movement.spin_speed) + movement.spin_delay);
      gl.bindTexture(gl.TEXTURE_2D, textures[movement.texture]);
      gl.drawArrays(primitiveType, offset, count);
    }
    var deltaTime = 0;
    var startTime = performance.now();
    function spinOutAnimation(time) {
      deltaTime = time-startTime;
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      drawWaveSpin(deltaTime, wave1Movement);
      drawWaveSpin(deltaTime, wave2Movement);
      drawWaveSpin(deltaTime, wave3Movement);
      drawWaveSpin(deltaTime, wave4Movement);
      drawWaveSpin(deltaTime, wave5Movement);
      drawWaveSpin(deltaTime, wave6Movement);
      drawWaveSpin(deltaTime, wave7Movement);
      drawWaveSpin(deltaTime, wave8Movement);
      window.requestAnimationFrame(spinOutAnimation);
    }
    
    cancelAnimationFrame(myReq);
    spinOutAnimation(startTime);
  }
  document.onkeyup = handleKeyUp;
}

function setRectangle(gl, x, y, width, height) {
  var x1 = x;
  var x2 = x + width;
  var y1 = y;
  var y2 = y + height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
     x1, y1,
     x2, y1,
     x1, y2,
     x1, y2,
     x2, y1,
     x2, y2,
  ]), gl.STATIC_DRAW);
}
