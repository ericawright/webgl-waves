"use strict"

// Entrypoint
function InitDemo() {
  var scene = document.getElementById('scene');
    
  scene.dataset.content = 'true';
  
  var canvas = document.getElementById("canvas");
  var gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }
  var program = createProgramFromScripts(gl, ["2d-vertex-shader", "2d-fragment-shader"]);
  var blurProgram = createProgramFromScripts(gl, ["2d-vertex-shader-blur", "2d-fragment-shader-blur"]);

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, "a_position");
  var texcoordLocation = gl.getAttribLocation(program, "a_texCoord");

  // Create a buffer to put three 2d clip space points in
  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
  resizeCanvasToDisplaySize(gl.canvas);
    
  // Set a rectangle the same size as the canvas.
  setRectangle(gl, 0, 0, canvas.width, canvas.height);

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
  var xScaleVarianceLocation = gl.getUniformLocation(program, "u_x_scale_variance");
  var yScaleVarianceLocation = gl.getUniformLocation(program, "u_y_scale_variance");
  var xSkewVarianceLocation = gl.getUniformLocation(program, "u_x_skew_variance");
  var ySkewVarianceLocation = gl.getUniformLocation(program, "u_y_skew_variance");
  var xTranslateLocation = gl.getUniformLocation(program, "u_x_translate");
  var yTranslateLocation = gl.getUniformLocation(program, "u_y_translate");
  var imageLocation = gl.getUniformLocation(program, "u_image");
  var offsetLocation = gl.getUniformLocation(program, "u_offset");
  var sizeLocation = gl.getUniformLocation(program, "u_size");
  var timeLocation = gl.getUniformLocation(program, "u_time");
  // var zIndexLocation = gl.getUniformLocation(program, "u_z_index");
  // Blur uniforms
  var textureSizeLocation = gl.getUniformLocation(blurProgram, "u_textureSize");
  var kernelLocation = gl.getUniformLocation(blurProgram, "u_kernel[0]");
  var directionLocation = gl.getUniformLocation(blurProgram, "dir");
  var blurResolutionLocation = gl.getUniformLocation(blurProgram, "u_resolution");
  var blurImageLocation = gl.getUniformLocation(blurProgram, "u_image");
  
  // Spin uniforms
  var spinTimerLocation = gl.getUniformLocation(program, "u_spin_timer");
  var spinDegreesLocation = gl.getUniformLocation(program, "u_degrees");
  var spinXTranslateLocation = gl.getUniformLocation(program, "u_x_spin_translate");
  var spinYTranslateLocation = gl.getUniformLocation(program, "u_y_spin_translate");
  var spinFragTimeLocation = gl.getUniformLocation(program, "u_spin_time_frag");

  // Tell WebGL how to convert from clip space to pixels
  // gl.viewport(0, 0, canvas.width, canvas.height);

  // Clear the canvas
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

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

  var image = new Image();
  image.src = "all-solid-square-bw.gif";
  image.onload = (event) => {
    var createAndSetupTexture = function () {
      var texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      return texture;
    }
    
    var originalImageTexture = createAndSetupTexture();

    // Upload the image into the texture.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
 
    // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    // gl.blendFunc(gl.ONE, gl.DST_COLOR);
    gl.disable(gl.DEPTH_TEST);

    gl.uniform1i(imageLocation, 0);
    gl.uniform1f(sizeLocation, .123); // Width of each image
    gl.uniform1f(spinTimerLocation, 0); // Default spin timer starts at 0

    // more blur
     // var gb2pass = [
     //     0.110536,
     //     0.110967,
     //     0.111275,
     //     0.111461,
     //     0.111523,
     //     0.111461,
     //     0.111275,
     //     0.110967,
     //     0.110536
     //   ];
     
     // Less blur
      //  var gb2pass = [
      //   0.000229,
      //   0.005977,
      //   0.060598,
      //   0.241732,
      //   0.382928,
      //   0.241732,
      //   0.060598,
      //   0.005977,
      //   0.000229
      // ];
      
      //box blur
      var gb2pass = [
       1,
       2,
       3,
       3,
       5,
       3,
       3,
       2,
       1
     ];
     
     var textures = [];
     var framebuffers = [];
     for (var ii = 0; ii < 2; ++ii) {
       var texture = createAndSetupTexture(gl);
       textures.push(texture);
    
       // make the texture the same size as the image
       console.log(image.height, image.width)
       gl.texImage2D(
           gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0,
           gl.RGBA, gl.UNSIGNED_BYTE, null);
    
       // Create a framebuffer
       var fbo = gl.createFramebuffer();
       framebuffers.push(fbo);
       gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    
       // Attach a texture to it.
       gl.framebufferTexture2D(
           gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    }
    let nextTexture;
    nextTexture = nextTexture || originalImageTexture; 
      
    function drawWaves(time, movement) {
      gl.uniform1f(offsetLocation, movement.texture_offset[0], movement.texture_offset[1]);
      gl.uniform1f(xScaleBaseLocation, movement.xScaleBase);
      gl.uniform1f(yScaleBaseLocation, movement.yScaleBase);
      gl.uniform1f(xScaleVarianceLocation, movement.xScaleVariance);
      gl.uniform1f(yScaleVarianceLocation, movement.yScaleVariance);
      gl.uniform1f(xSkewVarianceLocation, movement.xSkewVariance);
      gl.uniform1f(ySkewVarianceLocation, movement.ySkewVariance);
      gl.uniform1f(initialXLocation, movement.initialX);
      gl.uniform1f(initialYLocation, movement.initialY);
      gl.uniform1f(xTranslateLocation, movement.translateX);
      gl.uniform1f(yTranslateLocation, movement.translateY);
      gl.uniform1f(timeLocation, ((time * movement.speed) + movement.delay) % movement.period);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    
    let wave1Movement = {
      xScaleBase: 1.45,
      yScaleBase: 1.5,
      xScaleVariance: 0.1,
      yScaleVariance: 0.1,
      xSkewVariance: 0.0,
      ySkewVariance: 0.0,
      initialX: 0.0,
      initialY: 0.1,
      translateX: 0.0,
      translateY: 0.0,
      delay: 4.5,
      speed: 0.0015,
      texture_offset: [200.0, 200,0],
      period: 11,
      zindex: 1,
      
      spin_delay: -1.0,
      spin_radians: 4.0,
      spin_translateX: 0.9,
      spin_translateY: 1.4,
      spin_speed: 0.002,
    }
    let wave2Movement = {
      xScaleBase: 1.4,
      yScaleBase: 1.3,
      xScaleVariance: 0.1,
      yScaleVariance: 0.1,
      xSkewVariance: 0.0,
      ySkewVariance: 0.0,
      initialX: 0.0,
      initialY: -0.3,
      translateX: 0.0,
      translateY: 0.0,
      delay: 4.5,
      speed: 0.0016,
      texture_offset: 0.124,
      period: 11,
      zindex: 0.9,
      
      spin_delay: -1.0,
      spin_radians: 0.0,
      spin_translateX: 0.1,
      spin_translateY: -0.8,
      spin_speed: 0.0028,
    }
    let wave3Movement = {
      xScaleBase: 1.3,
      yScaleBase: 0.6,
      xScaleVariance: 0.2,
      yScaleVariance: 0.0,
      xSkewVariance: 0.3,
      ySkewVariance: 0.0,
      initialX: 0.0,
      initialY: -0.5,
      translateX: 0.0,
      translateY: 0.0,
      delay: 4.5,
      speed: 0.0011,
      texture_offset: 0.2495,
      period: 11,
      zindex: .8,
      
      spin_delay: -1.0,
      spin_radians: 2.1,
      spin_translateX: 0.25,
      spin_translateY: 0.25,
      spin_speed: 0.0027,
    }
    let wave4Movement = {
      xScaleBase: 1.3,
      yScaleBase: 1.2,
      xScaleVariance: 0.0,
      yScaleVariance: -0.1,
      xSkewVariance: -0.1,
      ySkewVariance: 0.0,
      initialX: 0.0,
      initialY: -0.8,
      translateX: 0.0,
      translateY: 0.0,
      delay: 4.5,
      speed: 0.00018,
      texture_offset: 0.3735,
      period: 11,
      zindex: .7,
      
      spin_delay: -1.0,
      spin_radians: 0.5,
      spin_translateX: 0.4,
      spin_translateY: -0.3,
      spin_speed: 0.0026,
    }
    
    let wave5Movement = {
      xScaleBase: 1.7,
      yScaleBase: 0.5,
      xScaleVariance: -0.2,
      yScaleVariance: 0.1,
      xSkewVariance: 0.3,
      ySkewVariance: 0.0,
      initialX: 0.15,
      initialY: 0.15,
      translateX: 0.0,
      translateY: -0.1,
      delay: 4.5,
      speed: 0.0005,
      texture_offset: 0.4965,
      period: (4 * Math.PI),
      zindex: .6,
      
      spin_delay: -1.0,
      spin_radians: 1.4,
      spin_translateX: 0.8,
      spin_translateY: -0.3,
      spin_speed: 0.0025,
    }
    
    let wave6Movement = {
      xScaleBase: 1.5,
      yScaleBase: 1.3,
      xScaleVariance: 0.15,
      yScaleVariance: 0.15,
      xSkewVariance: 0.2,
      ySkewVariance: 0.0,
      initialX: 0.0,
      initialY: 0.4,
      translateX: 0.0,
      translateY: 0.0,
      delay: 4.5,
      speed: 0.00048,
      texture_offset: 0.6215,
      period: (4 * Math.PI),
      zindex: .5,
      
      spin_delay: -1.0,
      spin_radians: 2.0,
      spin_translateX: -0.6,
      spin_translateY: -0.0,
      spin_speed: 0.0026,
    }
    
    let wave7Movement = {
      xScaleBase: 0.8,
      yScaleBase: 1.0,
      xScaleVariance: 0.1,
      yScaleVariance: 0.25,
      xSkewVariance: 0.15,
      ySkewVariance: 0.0,
      initialX: 0.3,
      initialY: 0.4,
      translateX: 0.0,
      translateY: 0.0,
      delay: 4.5,
      speed: 0.0006,
      texture_offset: 0.747,
      period: (4 * Math.PI),
      zindex: .4,
      
      spin_delay: -1.0,
      spin_radians: 3.0,
      spin_translateX: -0.4,
      spin_translateY: -0.2,
      spin_speed: 0.0025,
    }
    
    let wave8Movement = {
      xScaleBase: 1.5,
      yScaleBase: 0.8,
      xScaleVariance: 0.0,
      yScaleVariance: -0.05,
      xSkewVariance: 0.2,
      ySkewVariance: 0.0,
      initialX: -0.11,
      initialY: 0.3,
      translateX: 0.0,
      translateY: 0.0,
      delay: 4.5,
      speed: 0.00051,
      texture_offset: 0.877,
      period: (4 * Math.PI),
      zindex: 3,
      
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

    function clipAndPosition(time) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      resizeCanvasToDisplaySize(gl.canvas); // can't resize?
      waveDeltaTime = time - waveStartTime;
      drawWaves(waveDeltaTime, wave1Movement);
      // drawWaves(waveDeltaTime, wave2Movement);
      // drawWaves(waveDeltaTime, wave3Movement);
      // drawWaves(waveDeltaTime, wave4Movement);
      // drawWaves(waveDeltaTime, wave5Movement);
      // drawWaves(waveDeltaTime, wave6Movement);
      // drawWaves(waveDeltaTime, wave7Movement);
      // drawWaves(waveDeltaTime, wave8Movement);
    
    }
  

    let blur = 0;
    let oldBlur = 0;
    function animate(time) {
      // Start blur counter, then count down after click
      blur = Math.min(Math.floor((time * .008)), 125);
      if (!blur) { // can get rid of this
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        gl.viewport(0, 0, canvas.width, canvas.height);
      
        gl.useProgram(program); // Use clip and move program
        gl.bindTexture(gl.TEXTURE_2D, nextTexture);
        clipAndPosition(time); // clip and move (and draw)
        myReq = window.requestAnimationFrame(animate);
        return;
      }
    
      if (blur > oldBlur) {
        //Use first framebuffer 
        gl.useProgram(blurProgram); // Use blur program
        console.log(image.height, image.width, canvas.height, canvas.width);
        gl.uniform1fv(kernelLocation, gb2pass);
        gl.uniform2f(textureSizeLocation, image.width, image.height);
        gl.uniform2f(blurResolutionLocation, canvas.width, canvas.height);
        gl.viewport(0, 0, image.width, image.height);
        gl.uniform1i(blurImageLocation, 0);
        gl.uniform2f(directionLocation, 0.0, 1.0); // Blur vertical
    
        // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[0]);
        gl.viewport(0, 0, image.width, image.height);
                
        gl.bindTexture(gl.TEXTURE_2D, nextTexture);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6); // just blur

        nextTexture = textures[0];
        
        gl.uniform2f(directionLocation, 1.0, 0.0); // Blur horizontal
        gl.uniform2f(textureSizeLocation, image.width, image.height);
        gl.uniform2f(blurResolutionLocation, canvas.width, canvas.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[1]);
        gl.viewport(0, 0, image.width, image.height);
        gl.bindTexture(gl.TEXTURE_2D, nextTexture);
        gl.drawArrays(gl.TRIANGLES, 0, 6); //just blur
        oldBlur = blur;
      }
      nextTexture = textures[1];
      // gl.uniform2f(directionLocation, 1.0, 0.0); // Blur horizontal
      // gl.uniform2f(textureSizeLocation, image.width, image.height);
      // gl.uniform2f(blurResolutionLocation, canvas.width, canvas.height);
      // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      // gl.viewport(0, 0, image.width, image.height);
      // gl.bindTexture(gl.TEXTURE_2D, nextTexture);
      // gl.drawArrays(gl.TRIANGLES, 0, 6); //just blur
      
      gl.useProgram(program);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.viewport(0, 0, canvas.width, canvas.height);
      clipAndPosition(time); // clip and move (and draw)
      
      myReq = window.requestAnimationFrame(animate);
    }

    // function animate(time) {
    //   // Start blur counter, then count down after click
    //   blur = Math.min(Math.floor((time * .004)), 15);
    //   gl.useProgram(program); // Use clip and move program
    //   if (!blur) {
    //     gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    //     gl.bindTexture(gl.TEXTURE_2D, nextTexture);
    //     clipAndPosition(time); // clip and move
    //     myReq = window.requestAnimationFrame(animate);
    //     return;
    //   }
    //   // Use first frame buffer
    //   gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[0]);
    //   gl.bindTexture(gl.TEXTURE_2D, nextTexture);
    //   clipAndPosition(time); // clip and move
    // 
    //   for (let i = 0; i <= blur; i++) {
    //     nextTexture = textures[0];
    //     //Use second framebuffer 
    //     gl.useProgram(blurProgram); // Use blur program
    //     gl.uniform2f(textureSizeLocation, canvas.width, canvas.height);
    //     gl.uniform1fv(kernelLocation, gb2pass);
    //     gl.uniform2f(blurResolutionLocation, canvas.width, canvas.height);
    //     gl.uniform1i(blurImageLocation, 0);
    //     gl.uniform2f(directionLocation, 0.0, 1.0); // Blur vertical
    // 
    //     gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[1]);
    //     gl.bindTexture(gl.TEXTURE_2D, nextTexture);
    //     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    //     gl.drawArrays(gl.TRIANGLES, 0, 6); //just draw and blur
    //     nextTexture = textures[1];
    //     gl.uniform2f(directionLocation, 1.0, 0.0); // Blur horizontal
    // 
    //     // Draw to canvas or framebuffer
    //     gl.bindFramebuffer(gl.FRAMEBUFFER, i == blur? null : framebuffers[0]);
    //     gl.bindTexture(gl.TEXTURE_2D, nextTexture);
    //     gl.drawArrays(gl.TRIANGLES, 0, 6); //just draw and blur
    //   }
    //   nextTexture = originalImageTexture;
    //   myReq = window.requestAnimationFrame(animate);
    // }
    requestAnimationFrame(animate);
    
    // Change to rotation/spin shaders on click
    function handleClick () {
      gl.useProgram(program);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, originalImageTexture);
      scene.dataset.signIn = 'true';

      function drawWaveSpin (time, movement) {
        gl.uniform1f(offsetLocation, movement.texture_offset[0], movement.texture_offset[1]);
        gl.uniform1f(xScaleBaseLocation, movement.xScaleBase);
        gl.uniform1f(yScaleBaseLocation, movement.yScaleBase);
        gl.uniform1f(xScaleVarianceLocation, movement.xScaleVariance);
        gl.uniform1f(yScaleVarianceLocation, movement.yScaleVariance);
        gl.uniform1f(xSkewVarianceLocation, movement.xSkewVariance);
        gl.uniform1f(ySkewVarianceLocation, movement.ySkewVariance);
        gl.uniform1f(initialXLocation, movement.initialX);
        gl.uniform1f(initialYLocation, movement.initialY);
        gl.uniform1f(xTranslateLocation, movement.translateX);
        gl.uniform1f(yTranslateLocation, movement.translateY);
        gl.uniform1f(timeLocation, ((waveDeltaTime * movement.speed) + movement.delay) % movement.period);
        
      
        // spin uniforms
        gl.uniform1f(spinTimerLocation, (time * movement.spin_speed) + movement.spin_delay);
        gl.uniform1f(spinXTranslateLocation, movement.spin_translateX);
        gl.uniform1f(spinYTranslateLocation, movement.spin_translateY);
        gl.uniform1f(spinDegreesLocation, movement.spin_radians);

        gl.uniform1f(spinFragTimeLocation, (time * movement.spin_speed) + -1.0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      var deltaTime = 0;
      var startTime = performance.now();
      function spinOutAnimation(time) {
        deltaTime = time - startTime;
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
    document.getElementById("sign-in").onclick = handleClick;
  }
}





// Utility Functions
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
