import type { Camera } from './types';

export const FOCAL = 800;
export const TAU = Math.PI * 2;
export const LOD_DOT = 4;
export const LOD_SIMPLE = 10;

export function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export function getCameraEye(cam: Camera): [number, number, number] {
  const sp = Math.sin(cam.orbitPhi);
  const cp = Math.cos(cam.orbitPhi);
  const st = Math.sin(cam.orbitTheta);
  const ct = Math.cos(cam.orbitTheta);
  return [
    cam.tx + cam.orbitDist * sp * st,
    cam.ty + cam.orbitDist * cp + Math.sin(cam.bobPhase) * 4,
    cam.tz + cam.orbitDist * sp * ct,
  ];
}

export function getCameraBasis(eye: [number, number, number], target: [number, number, number], theta: number): {
  fwd: [number, number, number]; right: [number, number, number]; up: [number, number, number];
} {
  let fx = target[0] - eye[0], fy = target[1] - eye[1], fz = target[2] - eye[2];
  const fl = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
  fx /= fl; fy /= fl; fz /= fl;
  // Choose up hint: worldUp unless looking nearly straight up/down (gimbal lock)
  let hx = 0, hy = 1, hz = 0;
  if (Math.abs(fy) > 0.99) {
    // At poles — use theta-derived horizontal as up hint to avoid zero cross product
    hx = Math.sin(theta); hy = 0; hz = Math.cos(theta);
  }
  // right = forward × upHint
  let rx = fy * hz - fz * hy, ry = fz * hx - fx * hz, rz = fx * hy - fy * hx;
  const rl = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
  rx /= rl; ry /= rl; rz /= rl;
  // up = right × forward
  const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
  return { fwd: [fx, fy, fz], right: [rx, ry, rz], up: [ux, uy, uz] };
}

export function project(wx: number, wy: number, wz: number, eye: [number, number, number],
  right: [number, number, number], up: [number, number, number], fwd: [number, number, number],
  cx: number, cy: number) {
  const dx = wx - eye[0], dy = wy - eye[1], dz = wz - eye[2];
  const camX = dx * right[0] + dy * right[1] + dz * right[2];
  const camY = dx * up[0] + dy * up[1] + dz * up[2];
  const camZ = dx * fwd[0] + dy * fwd[1] + dz * fwd[2];
  if (camZ < 1) return { sx: -9999, sy: -9999, scale: 0.001, depth: 9999 };
  const scale = FOCAL / camZ;
  return { sx: cx + camX * scale, sy: cy - camY * scale, scale, depth: camZ };
}

export function depthFog(depth: number, orbitDist: number) {
  const fogNear = -orbitDist * 0.3;
  const fogFar = orbitDist * 2.5;
  return Math.max(0, Math.min(1, 1 - (depth - fogNear) / (fogFar - fogNear)));
}
