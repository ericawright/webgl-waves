"use strict"



// Entrypoint
function initDemo() {
  var canvas = document.getElementById("canvas");
  var gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

   // webglUtils.resizeCanvasToDisplaySize(gl.canvas);
   console.log(canvas.width, canvas.height)

  var program = webglUtils.createProgramFromScripts(gl, ["2d-vertex-shader", "2d-fragment-shader"]);
  var blurProgram =  webglUtils.createProgramFromScripts(gl, ["2d-vertex-shader-blur", "2d-fragment-shader-blur"]);
  // var spinProgram =  webglUtils.createProgramFromScripts(gl, ["2d-vertex-shader-spin", "2d-fragment-shader-spin"]);

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, "a_position");
  var texcoordLocation = gl.getAttribLocation(program, "a_texCoord");
  
  // var blurPositionLocation = gl.getAttribLocation(blurProgram, "a_position");
  // var blurTexCoordLocation = gl.getAttribLocation(blurProgram, "a_texCoord");

  // Create a buffer to put three 2d clip space points in
  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  
  // Set a rectangle the same size as the canvas.
  setRectangle(gl, 0, 0, canvas.clientWidth, canvas.clientHeight);
  // setRectangle( gl, 0, 0, 10000, 2048);

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
  var imageLocation = gl.getUniformLocation(program, "u_image");
  var offsetLocation = gl.getUniformLocation(program, "u_offset");
  var widthLocation = gl.getUniformLocation(program, "u_width");
  var timeLocation = gl.getUniformLocation(program, "u_time");
  // Blur Uniforms
  var textureSizeLocation = gl.getUniformLocation(blurProgram, "u_textureSize");
  var kernelLocation = gl.getUniformLocation(blurProgram, "u_kernel[0]");
  var kernelWeightLocation = gl.getUniformLocation(blurProgram, "u_kernelWeight");
  var directionLocation =  gl.getUniformLocation(blurProgram, "dir");
  var blurResolutionLocation = gl.getUniformLocation(blurProgram, "u_resolution");
  var blurImageLocation = gl.getUniformLocation(blurProgram, "u_image");


  // Tell it to use our program (pair of shaders)
  gl.useProgram(program);

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


  var size = 2;          // 2 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
      texcoordLocation, size, type, normalize, stride, offset);

  // set the resolution
  gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
  
  var createAndSetupTexture = function () {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return texture;
  }
  

  var image = new Image();
  image.src = "./all-wavesa.png";
  image.width = 10000;
  image.height = 2048;
  image.onload = function () {
    var originalImageTexture = createAndSetupTexture();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    var framebuffers = [];
    var gb2pass = [
        0.110536,
        0.110967,
        0.111275,
        0.111461,
        0.111523,
        0.111461,
        0.111275,
        0.110967,
        0.110536
      ];
    
    var textures = [];
    var framebuffers = [];
    for (var ii = 0; ii < 2; ++ii) {
      var texture = createAndSetupTexture(gl);
      textures.push(texture);

      // make the texture the same size as the image
      gl.texImage2D(
          gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0,
          gl.RGBA, gl.UNSIGNED_BYTE, null);

      // Create a framebuffer
      var fbo = gl.createFramebuffer();
      framebuffers.push(fbo);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

      // Attach a texture to it.
      gl.framebufferTexture2D(
          gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    }
    
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    gl.uniform1i(imageLocation, 0);
    gl.uniform1f(widthLocation, .123); // Width of each image
      
    function drawWaves(time, movement) {
      gl.uniform1f(offsetLocation, movement.texture_offset);
      // if (0) {
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
      // }
      gl.uniform1f(timeLocation, ((time * movement.speed) + movement.delay) % movement.period);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
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
      delay: 3.2,
      speed: 0.0015,
      texture_offset: 0.0,
      period: 11,
      
      spin_delay: -1.0,
      spin_radians: 4.0,
      spin_translateX: 0.9,
      spin_translateY: 1.4,
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
      delay: 3.2,
      speed: 0.0016,
      texture_offset: 0.124,
      period: 11,
      
      spin_delay: -1.0,
      spin_radians: 0.0,
      spin_translateX: 0.1,
      spin_translateY: -0.8,
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
      delay: 3.2,
      speed: 0.0011,
      texture_offset: 0.2495,
      period: 11,
      
      spin_delay: -1.0,
      spin_radians: 2.1,
      spin_translateX: 0.25,
      spin_translateY: 0.25,
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
      delay: 3.2,
      speed: 0.00018,
      texture_offset: 0.3735,
      period: 11,
      
      spin_delay: -1.0,
      spin_radians: 0.5,
      spin_translateX: 0.4,
      spin_translateY: -0.3,
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
      delay: 3.2,
      speed: 0.0005,
      texture_offset: 0.4965,
      period: (4 * Math.PI),
      
      spin_delay: -1.0,
      spin_radians: 1.4,
      spin_translateX: 0.8,
      spin_translateY: -0.3,
      spin_speed: 0.0025,
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
      delay: 3.2,
      speed: 0.00048,
      texture_offset: 0.6215,
      period: (4 * Math.PI),
      
      spin_delay: -1.0,
      spin_radians: 2.0,
      spin_translateX: -0.6,
      spin_translateY: -0.0,
      spin_speed: 0.0026,
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
      delay: 3.2,
      speed: 0.0006,
      texture_offset: 0.747,
      period: (4 * Math.PI),
      
      spin_delay: -1.0,
      spin_radians: 3.0,
      spin_translateX: -0.4,
      spin_translateY: -0.2,
      spin_speed: 0.0025,
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
      delay: 3.2,
      speed: 0.00051,
      texture_offset: 0.877,
      period: (4 * Math.PI),
      
      spin_delay: -1.0,
      spin_radians: 2.0,
      spin_translateX: -0.4,
      spin_translateY: -0.1,
      spin_speed: 0.002,
    }
    
    var myReq;
    var oldTime = 0;
    var waveStartTime = performance.now();
    var waveDeltaTime = 0;
    
    let nextTexture;
    
    gl.useProgram(blurProgram);

    gl.uniform2f(textureSizeLocation, image.width, image.height);
    gl.uniform1i(blurImageLocation, 0);
    gl.uniform1fv(kernelLocation, gb2pass);
    gl.uniform1f(kernelWeightLocation, 1.0);
    nextTexture = nextTexture || originalImageTexture; 
    for (let v = 0; v < 1; v++) {
      // Use first frame buffer
      gl.bindTexture(gl.TEXTURE_2D, nextTexture);
      gl.uniform2f(directionLocation, 1.0, 0.0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[0]);
      gl.uniform2f(blurResolutionLocation, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      nextTexture = textures[0];
      
      // Use second framebuffer 
      gl.bindTexture(gl.TEXTURE_2D, nextTexture);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[1]);
      gl.uniform2f(blurResolutionLocation, canvas.width, canvas.height);
      gl.uniform2f(directionLocation, 0.0, 1.0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      nextTexture = textures[1];
    }


    
    // Draw for real
    gl.useProgram(program);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    // gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, nextTexture);    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    function animate(time) {
        waveDeltaTime = time - waveStartTime;
      gl.clear(gl.COLOR_BUFFER_BIT);
      drawWaves(waveDeltaTime, wave1Movement);
      drawWaves(waveDeltaTime, wave2Movement);
      drawWaves(waveDeltaTime, wave3Movement);
      drawWaves(waveDeltaTime, wave4Movement);
      drawWaves(waveDeltaTime, wave5Movement);
      drawWaves(waveDeltaTime, wave6Movement);
      drawWaves(waveDeltaTime, wave7Movement);
      drawWaves(waveDeltaTime, wave8Movement);
    
      myReq = window.requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
    
    // Change to rotation/spin shaders on keypress
    // function handleKeyUp () {
    //   gl.useProgram(spinProgram);
    // 
    //   var spinResolutionLocation = gl.getUniformLocation(spinProgram, "u_resolution");
    //   var spinTimeLocation = gl.getUniformLocation(spinProgram, "u_time");
    //   var spinDegreesLocation = gl.getUniformLocation(spinProgram, "u_degrees");
    //   var spinXTranslateLocation = gl.getUniformLocation(spinProgram, "u_x_spin_translate");
    //   var spinYTranslateLocation = gl.getUniformLocation(spinProgram, "u_y_spin_translate");
    //   var spinFragTimeLocation = gl.getUniformLocation(spinProgram, "u_spin_time");
    //   var endTimeLocation = gl.getUniformLocation(spinProgram, "u_old_end_time");
    // 
    //   var spinWidthLocation = gl.getUniformLocation(spinProgram, "u_width");
    //   var spinOffsetLocation = gl.getUniformLocation(spinProgram, "u_offset");
    //   var spinResolutionLocation = gl.getUniformLocation(spinProgram, "u_resolution");
    //   var spinInitialXLocation = gl.getUniformLocation(spinProgram, "u_x_coord");
    //   var spinInitialYLocation = gl.getUniformLocation(spinProgram, "u_y_coord");
    //   var spinXScaleBaseLocation = gl.getUniformLocation(spinProgram, "u_x_scale_base");
    //   var spinYScaleBaseLocation = gl.getUniformLocation(spinProgram, "u_y_scale_base");
    //   var spinXScaleVarienceLocation = gl.getUniformLocation(spinProgram, "u_x_scale_varience");
    //   var spinYScaleVarienceLocation = gl.getUniformLocation(spinProgram, "u_y_scale_varience");
    //   var spinXSkewVarienceLocation = gl.getUniformLocation(spinProgram, "u_x_skew_varience");
    //   var spinYSkewVarienceLocation = gl.getUniformLocation(spinProgram, "u_y_skew_varience");
    //   var spinOldXTranslateLocation = gl.getUniformLocation(spinProgram, "u_x_translate");
    //   var spinOldYTranslateLocation = gl.getUniformLocation(spinProgram, "u_y_translate");
    //   var spinImageLocation = gl.getUniformLocation(spinProgram, "u_image");
    // 
    //   gl.uniform2f(spinResolutionLocation, gl.canvas.width, gl.canvas.height);
    //   gl.uniform1i(spinImageLocation, 0);
    //   gl.uniform1f(spinWidthLocation, .123);
    // 
    //   function drawWaveSpin (time, movement) {
    //     // old wave uniforms
    //     gl.uniform1f(spinOffsetLocation, movement.texture_offset);
    //     gl.uniform1f(spinXScaleBaseLocation, movement.xScaleBase);
    //     gl.uniform1f(spinYScaleBaseLocation, movement.yScaleBase);
    //     gl.uniform1f(spinXScaleVarienceLocation, movement.xScaleVarience);
    //     gl.uniform1f(spinYScaleVarienceLocation, movement.yScaleVarience);
    //     gl.uniform1f(spinXSkewVarienceLocation, movement.xSkewVarience);
    //     gl.uniform1f(spinYSkewVarienceLocation, movement.ySkewVarience);
    //     gl.uniform1f(spinInitialXLocation, movement.initialX);
    //     gl.uniform1f(spinInitialYLocation, movement.initialY);
    //     gl.uniform1f(spinOldXTranslateLocation, movement.translateX);
    //     gl.uniform1f(spinOldYTranslateLocation, movement.translateY);
    // 
    //     // spin uniforms
    //     gl.uniform1f(spinXTranslateLocation, movement.spin_translateX);
    //     gl.uniform1f(spinYTranslateLocation, movement.spin_translateY);
    //     gl.uniform1f(spinDegreesLocation, movement.spin_radians);
    //     gl.uniform1f(endTimeLocation, ((waveDeltaTime * movement.speed) + movement.delay) % movement.period);
    // 
    //     gl.uniform1f(spinTimeLocation, (time * movement.spin_speed) + movement.spin_delay);
    //     gl.uniform1f(spinFragTimeLocation, (time * movement.spin_speed) + -1.0);
    //     gl.drawArrays(gl.TRIANGLES, 0, 6);
    //   }
    // 
    //   var deltaTime = 0;
    //   var startTime = performance.now();
    //   function spinOutAnimation(time) {
    //     deltaTime = time-startTime;
    //     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    //     drawWaveSpin(deltaTime, wave1Movement);
    //     drawWaveSpin(deltaTime, wave2Movement);
    //     drawWaveSpin(deltaTime, wave3Movement);
    //     drawWaveSpin(deltaTime, wave4Movement);
    //     drawWaveSpin(deltaTime, wave5Movement);
    //     drawWaveSpin(deltaTime, wave6Movement);
    //     drawWaveSpin(deltaTime, wave7Movement);
    //     drawWaveSpin(deltaTime, wave8Movement);
    //     window.requestAnimationFrame(spinOutAnimation);
    //   }
    // 
    //   cancelAnimationFrame(myReq);
    //   spinOutAnimation(startTime);
    // }
    // document.onkeyup = handleKeyUp;
  }
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
