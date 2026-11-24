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
