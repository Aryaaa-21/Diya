/** GLSL snippets shared by the procedural materials. */

export const NOISE = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
}
`;

/**
 * Cylindrical billboard: the quad turns to face the camera around world Y only,
 * so a flame always stands upright. Works with and without instancing.
 */
export const BILLBOARD_UPRIGHT = /* glsl */ `
vec3 billboardUpright(mat4 m, vec3 local) {
  vec3 center = (m * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float s = length(m[0].xyz);
  vec3 toCam = cameraPosition - center;
  toCam.y = 0.0;
  vec3 right = length(toCam) < 1e-4 ? vec3(1.0, 0.0, 0.0) : normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
  return center + (right * local.x + vec3(0.0, local.y, 0.0)) * s;
}
`;

/** Spherical billboard using the camera's own axes. */
export const BILLBOARD_SPHERE = /* glsl */ `
vec3 billboardSphere(mat4 m, vec3 local) {
  vec3 center = (m * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float s = length(m[0].xyz);
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  return center + (right * local.x + up * local.y) * s;
}
`;

/** Model matrix including the instance transform when instanced. */
export const INSTANCE_MATRIX = /* glsl */ `
mat4 objectMatrix() {
  #ifdef USE_INSTANCING
    return modelMatrix * instanceMatrix;
  #else
    return modelMatrix;
  #endif
}
`;
