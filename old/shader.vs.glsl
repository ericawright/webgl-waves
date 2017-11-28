// precision mediump float;
// 
// attribute vec3 vertPosition;
// attribute vec2 vertTexCoord;
// varying vec2 fragTexCoord;
// uniform mat4 mWorld;
// uniform mat4 mView;
// uniform mat4 mProj;
// 
// void main()
// {
//   fragTexCoord = vertTexCoord;
//   gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
// }
attribute vec2 a_position;
attribute vec2 a_texCoord;

uniform vec2 u_resolution;

varying vec2 v_texCoord;

void main() {
   // convert the rectangle from pixels to 0.0 to 1.0
   vec2 zeroToOne = a_position / u_resolution;

   // convert from 0->1 to 0->2
   vec2 zeroToTwo = zeroToOne * 2.0;

   // convert from 0->2 to -1->+1 (clipspace)
   vec2 clipSpace = zeroToTwo - 1.0;

   gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

   // pass the texCoord to the fragment shader
   // The GPU will interpolate this value between points.
   v_texCoord = a_texCoord;
}