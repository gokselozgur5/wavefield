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

FdtdCpuSolver.prototype.step = function (subSteps = 1, sources = []) {
  const w = this.width, h = this.height, cDtDx = this.cDtDx;
  for (let s = 0; s < subSteps; s++) {
    for (let y = 0; y < h - 1; y++) {
      const hxRow = y * w, ezRowCurr = y * w, ezRowNext = (y + 1) * w;
      for (let x = 0; x < w; x++) {
        this.hx[hxRow + x] -= cDtDx * (this.ez[ezRowNext + x] - this.ez[ezRowCurr + x]);
      }
    }
    const hyW = w - 1;
    for (let y = 0; y < h; y++) {
      const hyRow = y * hyW, ezRow = y * w;
      for (let x = 0; x < hyW; x++) {
        this.hy[hyRow + x] += cDtDx * (this.ez[ezRow + (x + 1)] - this.ez[ezRow + x]);
      }
    }
    for (let y = 1; y < h - 1; y++) {
      const ezRow = y * w, hxRowCurr = y * w, hxRowPrev = (y - 1) * w, hyRow = y * hyW;
      for (let x = 1; x < w - 1; x++) {
        const idx = ezRow + x;
        const mat = this.materials[idx] || 0;
        const curlH = (this.hy[hyRow + x] - this.hy[hyRow + (x - 1)]) - (this.hx[hxRowCurr + x] - this.hx[hxRowPrev + x]);
        this.ez[idx] = this.ca[mat] * this.ez[idx] + this.cb[mat] * curlH;
      }
    }
    const t = this.stepCount * this.dt;
    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      if (src.x >= 0 && src.x < w && src.y >= 0 && src.y < h) {
        const val = src.amp * Math.sin(2.0 * Math.PI * src.freq * t + src.phase);
        this.ez[src.y * w + src.x] += val;
      }
    }
    this._applyMur();
    this.stepCount++;
  }
};

FdtdCpuSolver.prototype._applyMur = function () {
  const w = this.width, h = this.height;
  const factor = (SPEED_OF_LIGHT * this.dt - this.dx) / (SPEED_OF_LIGHT * this.dt + this.dx);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    this.ez[row] += factor * (this.ez[row + 1] - this.ez[row]);
    this.ez[row + (w - 1)] += factor * (this.ez[row + (w - 2)] - this.ez[row + (w - 1)]);
  }
  const lastRow = (h - 1) * w;
  const prevRow = (h - 2) * w;
  for (let x = 0; x < w; x++) {
    this.ez[x] += factor * (this.ez[w + x] - this.ez[x]);
    this.ez[lastRow + x] += factor * (this.ez[prevRow + x] - this.ez[lastRow + x]);
  }
};

FdtdCpuSolver.prototype.probeDbm = function (x, y) {
  const gx = Math.max(0, Math.min(this.width - 1, Math.round(x)));
  const gy = Math.max(0, Math.min(this.height - 1, Math.round(y)));
  const val = Math.abs(this.ez[gy * this.width + gx]);
  const s = (val * val) / 376.73031346177;
  const pMw = s * 1000.0;
  const dbm = pMw <= 1e-15 ? -120.0 : Math.max(-120.0, Math.min(30.0, 10.0 * Math.log10(pMw)));
  return { dbm, ezAbs: val, material: this.materials[gy * this.width + gx] || 0 };
};

FdtdCpuSolver.prototype.renderToImageData = function (imgData, viewMode = '2d', minDbm = -90.0, maxDbm = 10.0) {
  const d = imgData.data, w = this.width, h = this.height, ez = this.ez, mats = this.materials;
  const is25D = viewMode === '25d';
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const idx = row + x, px = idx * 4;
      const mat = mats[idx];
      if (mat > 0) {
        const spec = MATERIAL_SPECS[mat] || MATERIAL_SPECS[0];
        d[px] = spec.color[0]; d[px + 1] = spec.color[1]; d[px + 2] = spec.color[2]; d[px + 3] = 255;
        continue;
      }
      const val = ez[idx], absVal = Math.abs(val);
      const s = (absVal * absVal) / 376.73031346177;
      const dbm = s <= 1e-18 ? -120.0 : Math.max(-120.0, Math.min(30.0, 10.0 * Math.log10(s * 1000.0)));
      const norm = Math.max(0, Math.min(1, (dbm - minDbm) / (maxDbm - minDbm)));
      const rgba = turboColormapRgba(norm);
      if (is25D) {
        const slopeX = (x < w - 1 ? ez[idx + 1] : val) - (x > 0 ? ez[idx - 1] : val);
        const slopeY = (y < h - 1 ? ez[idx + w] : val) - (y > 0 ? ez[idx - w] : val);
        const shade = Math.max(0.4, Math.min(1.4, 1.0 + (slopeX + slopeY) * 0.8));
        d[px] = Math.min(255, Math.round(rgba[0] * shade));
        d[px + 1] = Math.min(255, Math.round(rgba[1] * shade));
        d[px + 2] = Math.min(255, Math.round(rgba[2] * shade));
      } else {
        d[px] = rgba[0]; d[px + 1] = rgba[1]; d[px + 2] = rgba[2];
      }
      d[px + 3] = 255;
    }
  }
};
