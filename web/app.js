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

export function loadPreset(id) {
  const factory = PRESETS[id] || PRESETS['urban-5g'];
  const scene = factory(SIM_WIDTH, SIM_HEIGHT);
  state.presetId = id;
  state.freqGhz = scene.freqGhz;
  state.txX = scene.txX;
  state.txY = scene.txY;
  state.elements = scene.elements;
  state.steerDeg = scene.steerDeg;
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
  const deltaPhi = -2.0 * Math.PI * 0.5 * Math.sin(steerRad);
  const spacingCells = 3;
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
