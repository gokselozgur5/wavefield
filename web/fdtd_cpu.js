import { MaterialKind, MATERIAL_SPECS } from './materials.js';

const SPEED_OF_LIGHT = 299792458.0;
const EPSILON_0 = 8.8541878128e-12;
const MU_0 = 1.25663706212e-6;

export class FdtdCpuSolver {
  constructor(width, height, dx = 0.05) {
    this.width = width;
    this.height = height;
    this.dx = dx;
    this.dt = dx / (Math.SQRT2 * SPEED_OF_LIGHT);
    this.stepCount = 0;
    this.ez = new Float32Array(width * height);
    this.hx = new Float32Array(width * height);
    this.hy = new Float32Array(width * height);
    this.materials = new Uint8Array(width * height);
    this.ca = new Float32Array(6);
    this.cb = new Float32Array(6);
    this._initCoefficients();
  }

  _initCoefficients() {
    const cDtDx = this.dt / (this.dx * MU_0);
    this.cDtDx = cDtDx;
    for (let k = 0; k <= 5; k++) {
      const spec = MATERIAL_SPECS[k] || MATERIAL_SPECS[0];
      const eps = spec.epsR * EPSILON_0;
      const sigma = spec.sigma;
      const factor = (sigma * this.dt) / (2.0 * eps);
      this.ca[k] = (1.0 - factor) / (1.0 + factor);
      this.cb[k] = (this.dt / (eps * this.dx)) / (1.0 + factor);
    }
  }

  reset() {
    this.ez.fill(0);
    this.hx.fill(0);
    this.hy.fill(0);
    this.stepCount = 0;
  }
}
