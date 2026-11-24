import { FdtdCpuSolver } from './fdtd_cpu.js';
import { initWebGpuFdtd } from './fdtd_webgpu.js';
import { PRESETS } from './presets.js';

export const SIM_WIDTH = 320;
export const SIM_HEIGHT = 240;

export const state = {
  presetId: 'urban-5g',
  brush: 'move-tx',
  freqGhz: 3.5,
  elements: 4,
  steerDeg: 0,
  viewMode: '2d',
  paused: false,
  txX: 0.5,
  txY: 0.2,
  isDrawing: false,
  solver: new FdtdCpuSolver(SIM_WIDTH, SIM_HEIGHT, 0.04),
  gpuBackend: null,
};

export function updateGridDx() {
  const wavelength = 299792458.0 / (state.freqGhz * 1e9);
  const targetDx = wavelength / 10.0;
  state.solver.setDx(targetDx);
}

export function loadPreset(id) {
  const factory = PRESETS[id] || PRESETS['urban-5g'];
  const scene = factory(SIM_WIDTH, SIM_HEIGHT);
  state.presetId = id;
  state.freqGhz = scene.freqGhz;
  state.txX = scene.txX;
  state.txY = scene.txY;
  state.elements = scene.elements;
  state.steerDeg = scene.steerDeg;
  updateGridDx();
  state.solver.materials.set(scene.grid);
  state.solver.reset();
  syncUiFromState();
}

export function syncUiFromState() {
  const byId = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const elPreset = byId('select-preset'), elFreq = byId('slider-freq'), elFreqLbl = byId('label-freq');
  const elElems = byId('slider-elements'), elElemsLbl = byId('label-elements');
  const elSteer = byId('slider-steer'), elSteerLbl = byId('label-steer');
  if (elPreset) elPreset.value = state.presetId;
  if (elFreq) elFreq.value = state.freqGhz;
  if (elFreqLbl) elFreqLbl.textContent = Number(state.freqGhz).toFixed(2);
  if (elElems) elElems.value = state.elements;
  if (elElemsLbl) elElemsLbl.textContent = state.elements;
  if (elSteer) elSteer.value = state.steerDeg;
  if (elSteerLbl) elSteerLbl.textContent = state.steerDeg;
  const wl = 0.299792458 / state.freqGhz;
  const elWl = byId('telemetry-wavelength');
  if (elWl) elWl.textContent = wl.toFixed(3) + ' m';
}

export function computeActiveSources() {
  const sources = [];
  const centerX = Math.floor(state.txX * SIM_WIDTH);
  const centerY = Math.floor(state.txY * SIM_HEIGHT);
  const num = state.elements;
  const steerRad = (state.steerDeg * Math.PI) / 180.0;
  const wavelength = 299792458.0 / (state.freqGhz * 1e9);
  const spacingCells = 3;
  const dOverLambda = (spacingCells * state.solver.dx) / wavelength;
  const deltaPhi = -2.0 * Math.PI * dOverLambda * Math.sin(steerRad);
  const startOffset = -((num - 1) / 2.0) * spacingCells;
  for (let i = 0; i < num; i++) {
    sources.push({
      x: centerX,
      y: Math.round(centerY + startOffset + i * spacingCells),
      amp: 2.0 / Math.sqrt(num),
      freq: state.freqGhz * 1e9,
      phase: i * deltaPhi,
    });
  }
  return sources;
}

export function paintObstacle(gx, gy, brush) {
  const r = 3;
  const mat = Number(brush);
  const w = SIM_WIDTH, h = SIM_HEIGHT;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) {
        const x = gx + dx, y = gy + dy;
        if (x >= 0 && x < w && y >= 0 && y < h) {
          state.solver.materials[y * w + x] = mat;
        }
      }
    }
  }
}

export function getCanvasPointerCell(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
  const renderW = canvas.width * scale;
  const renderH = canvas.height * scale;
  const offX = rect.left + (rect.width - renderW) / 2.0;
  const offY = rect.top + (rect.height - renderH) / 2.0;
  const gx = Math.floor((e.clientX - offX) / scale);
  const gy = Math.floor((e.clientY - offY) / scale);
  return {
    gx: Math.max(0, Math.min(canvas.width - 1, gx)),
    gy: Math.max(0, Math.min(canvas.height - 1, gy)),
  };
}

export function handlePointerAction(e, canvas) {
  const { gx, gy } = getCanvasPointerCell(e, canvas);
  if (state.brush === 'move-tx') {
    state.txX = Math.max(0.05, Math.min(0.95, gx / canvas.width));
    state.txY = Math.max(0.05, Math.min(0.95, gy / canvas.height));
  } else {
    paintObstacle(gx, gy, state.brush);
  }
  const probe = state.solver.probeDbm(gx, gy);
  const elProbe = typeof document !== 'undefined' ? document.getElementById('telemetry-probe') : null;
  if (elProbe) {
    elProbe.textContent = `${probe.dbm.toFixed(1)} dBm (|Ez| ${probe.ezAbs.toFixed(2)} V/m)`;
  }
}

export function setupEventListeners(canvas) {
  if (typeof document === 'undefined') return;
  const on = (id, evt, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(evt, fn);
  };
  on('select-preset', 'change', (e) => loadPreset(e.target.value));
  on('select-brush', 'change', (e) => { state.brush = e.target.value; });
  on('slider-freq', 'input', (e) => {
    state.freqGhz = parseFloat(e.target.value);
    updateGridDx();
    syncUiFromState();
  });
  on('slider-elements', 'input', (e) => { state.elements = parseInt(e.target.value, 10); syncUiFromState(); });
  on('slider-steer', 'input', (e) => { state.steerDeg = parseInt(e.target.value, 10); syncUiFromState(); });
  on('select-view', 'change', (e) => { state.viewMode = e.target.value; });
  on('btn-pause', 'click', (e) => {
    state.paused = !state.paused;
    e.target.textContent = state.paused ? 'Resume' : 'Pause';
  });
  on('btn-reset', 'click', () => state.solver.reset());
  on('btn-clear-walls', 'click', () => { state.solver.materials.fill(0); state.solver.reset(); });

  canvas.addEventListener('mousedown', (e) => { state.isDrawing = true; handlePointerAction(e, canvas); });
  canvas.addEventListener('mousemove', (e) => {
    if (state.isDrawing) handlePointerAction(e, canvas);
    else {
      const { gx, gy } = getCanvasPointerCell(e, canvas);
      const p = state.solver.probeDbm(gx, gy);
      const elP = document.getElementById('telemetry-probe');
      if (elP) elP.textContent = `${p.dbm.toFixed(1)} dBm (|Ez| ${p.ezAbs.toFixed(2)} V/m)`;
    }
  });
  window.addEventListener('mouseup', () => { state.isDrawing = false; });
}

export async function main() {
  if (typeof document === 'undefined') return;
  const canvas = document.getElementById('sim-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d'), imgData = ctx.createImageData(SIM_WIDTH, SIM_HEIGHT);
  setupEventListeners(canvas);
  loadPreset(state.presetId);

  const engineBadge = document.getElementById('telemetry-engine');
  try {
    const gpu = await initWebGpuFdtd(SIM_WIDTH, SIM_HEIGHT);
    if (gpu) {
      state.gpuBackend = gpu;
      if (engineBadge) { engineBadge.textContent = 'CPU FDTD (WebGPU Ready)'; engineBadge.style.color = '#00e676'; }
    } else if (engineBadge) engineBadge.textContent = 'CPU FDTD';
  } catch (_e) {
    if (engineBadge) engineBadge.textContent = 'CPU FDTD';
  }

  let frames = 0, lastFpsTime = performance.now();
  function loop() {
    if (!state.paused) {
      const sources = computeActiveSources();
      state.solver.step(4, sources);
    }
    state.solver.renderToImageData(imgData, state.viewMode);
    ctx.putImageData(imgData, 0, 0);

    frames++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
      const elFps = document.getElementById('telemetry-fps');
      if (elFps) elFps.textContent = Math.round((frames * 1000) / (now - lastFpsTime));
      frames = 0;
      lastFpsTime = now;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', main);

