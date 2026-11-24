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
