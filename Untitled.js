function animate(time) {
  // Start blur counter, then count down after click
  blur = Math.min(Math.floor((time * .004)), 15);
  gl.useProgram(program); // Use clip and move program
  if (!blur) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, nextTexture);
    clipAndPosition(time); // clip and move
    myReq = window.requestAnimationFrame(animate);
    return;
  }
  // Use first frame buffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[0]);
  gl.bindTexture(gl.TEXTURE_2D, nextTexture);
  clipAndPosition(time); // clip and move

  for (let i = 0; i <= blur; i++) {
    nextTexture = textures[0];
    //Use second framebuffer 
    gl.useProgram(blurProgram); // Use blur program
    gl.uniform2f(textureSizeLocation, canvas.width, canvas.height);
    gl.uniform1fv(kernelLocation, gb2pass);
    gl.uniform2f(blurResolutionLocation, canvas.width, canvas.height);
    gl.uniform1i(blurImageLocation, 0);
    gl.uniform2f(directionLocation, 0.0, 1.0); // Blur vertical

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[1]);
    gl.bindTexture(gl.TEXTURE_2D, nextTexture);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6); //just draw and blur
    nextTexture = textures[1];
    gl.uniform2f(directionLocation, 1.0, 0.0); // Blur horizontal

    // Draw to canvas or framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, i == blur? null : framebuffers[0]);
    gl.bindTexture(gl.TEXTURE_2D, nextTexture);
    gl.drawArrays(gl.TRIANGLES, 0, 6); //just draw and blur
  }
  nextTexture = originalImageTexture;
  myReq = window.requestAnimationFrame(animate);
}