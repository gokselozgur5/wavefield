import { MaterialKind } from './materials.js';

export function fillRect(grid, width, height, x0, y0, w, h, mat) {
  const x1 = Math.max(0, x0), y1 = Math.max(0, y0);
  const x2 = Math.min(width, x0 + w), y2 = Math.min(height, y0 + h);
  for (let y = y1; y < y2; y++) {
    const row = y * width;
    for (let x = x1; x < x2; x++) grid[row + x] = mat;
  }
}

export function buildUrbanCanyon(w, h) {
  const g = new Uint8Array(w * h);
  const C = MaterialKind.Concrete, M = MaterialKind.Metal;
  fillRect(g, w, h, 0, 0, Math.floor(w * 0.38), Math.floor(h * 0.42), C);
  fillRect(g, w, h, Math.floor(w * 0.62), 0, Math.floor(w * 0.38), Math.floor(h * 0.42), C);
  fillRect(g, w, h, 0, Math.floor(h * 0.58), Math.floor(w * 0.38), Math.floor(h * 0.42), C);
  fillRect(g, w, h, Math.floor(w * 0.62), Math.floor(h * 0.58), Math.floor(w * 0.38), Math.floor(h * 0.42), C);
  fillRect(g, w, h, Math.floor(w * 0.48), Math.floor(h * 0.45), 4, 10, M);
  return { id: 'urban-5g', name: 'Urban 5G Canyon', freqGhz: 3.5, txX: 0.5, txY: 0.2, elements: 4, steerDeg: 0, grid: g };
}

export function buildIndoorWifi(w, h) {
  const g = new Uint8Array(w * h);
  const D = MaterialKind.Drywall, G = MaterialKind.Glass, M = MaterialKind.Metal;
  fillRect(g, w, h, 0, 0, w, 2, D);
  fillRect(g, w, h, 0, h - 2, w, 2, D);
  fillRect(g, w, h, 0, 0, 2, h, D);
  fillRect(g, w, h, w - 2, 0, 2, h, D);
  fillRect(g, w, h, Math.floor(w * 0.5), 2, 2, Math.floor(h * 0.4), D);
  fillRect(g, w, h, Math.floor(w * 0.5), Math.floor(h * 0.55), 2, Math.floor(h * 0.45), G);
  fillRect(g, w, h, 2, Math.floor(h * 0.5), Math.floor(w * 0.35), 2, D);
  fillRect(g, w, h, Math.floor(w * 0.15), Math.floor(h * 0.15), 10, 10, M);
  return { id: 'indoor-wifi', name: 'Indoor Wi-Fi Floorplan', freqGhz: 2.4, txX: 0.25, txY: 0.75, elements: 1, steerDeg: 0, grid: g };
}

export function buildFpvDrone(w, h) {
  const g = new Uint8Array(w * h);
  const C = MaterialKind.Concrete, F = MaterialKind.Foliage, M = MaterialKind.Metal;
  fillRect(g, w, h, Math.floor(w * 0.2), Math.floor(h * 0.3), 16, Math.floor(h * 0.4), C);
  fillRect(g, w, h, Math.floor(w * 0.48), Math.floor(h * 0.2), 24, 24, F);
  fillRect(g, w, h, Math.floor(w * 0.52), Math.floor(h * 0.6), 28, 22, F);
  fillRect(g, w, h, Math.floor(w * 0.75), Math.floor(h * 0.25), 20, Math.floor(h * 0.5), M);
  return { id: 'fpv-drone', name: '5.8 GHz FPV Drone Link', freqGhz: 5.8, txX: 0.1, txY: 0.5, elements: 2, steerDeg: 15, grid: g };
}

export function buildNavalRadar(w, h) {
  const g = new Uint8Array(w * h);
  const M = MaterialKind.Metal;
  fillRect(g, w, h, Math.floor(w * 0.65), Math.floor(h * 0.3), 8, 24, M);
  fillRect(g, w, h, Math.floor(w * 0.8), Math.floor(h * 0.6), 14, 10, M);
  fillRect(g, w, h, Math.floor(w * 0.55), Math.floor(h * 0.75), 10, 8, M);
  return { id: 'naval-radar', name: '10 GHz X-Band Radar', freqGhz: 10.0, txX: 0.15, txY: 0.5, elements: 8, steerDeg: 25, grid: g };
}

export const PRESETS = Object.freeze({
  'urban-5g': buildUrbanCanyon,
  'indoor-wifi': buildIndoorWifi,
  'fpv-drone': buildFpvDrone,
  'naval-radar': buildNavalRadar,
});
