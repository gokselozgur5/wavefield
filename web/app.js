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
  showAzimuthGrid: true,
  showScanlines: true,
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

export function computeRfLinkBudget() {
  const c = 299792458.0;
  const fHz = state.freqGhz * 1e9;
  const wl = c / fHz;
  const dRefMeters = 20.0;
  const fsplDb = 20.0 * Math.log10((4.0 * Math.PI * dRefMeters * fHz) / c);
  const directivityDbi = 10.0 * Math.log10(Math.max(1, state.elements)) + 6.0;
  const txPowerDbm = 30.0;
  const eirpDbm = txPowerDbm + directivityDbi;
  const rxSensDbm = -95.0;
  const estimatedRxDbm = eirpDbm - fsplDb;
  const linkMarginDb = estimatedRxDbm - rxSensDbm;
  return {
    wavelength: wl,
    fsplDb: fsplDb,
    directivityDbi: directivityDbi,
    linkMarginDb: linkMarginDb,
    eirpDbm: eirpDbm,
  };
}

export function syncUiFromState() {
  const byId = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const elPreset = byId('select-preset'), elFreq = byId('slider-freq'), elFreqLbl = byId('label-freq');
  const elElems = byId('slider-elements'), elElemsLbl = byId('label-elements');
  const elSteer = byId('slider-steer'), elSteerLbl = byId('label-steer');
  const elNeedle = byId('steering-needle'), elDialVal = byId('dial-steer-val');
  const elSteerDial = byId('antenna-steering-dial');

  if (elPreset) elPreset.value = state.presetId;
  if (elFreq) elFreq.value = state.freqGhz;
  if (elFreqLbl) elFreqLbl.textContent = Number(state.freqGhz).toFixed(2);
  if (elElems) elElems.value = state.elements;
  if (elElemsLbl) elElemsLbl.textContent = state.elements;
  if (elSteer) elSteer.value = state.steerDeg;
  if (elSteerLbl) elSteerLbl.textContent = state.steerDeg;

  if (elNeedle) elNeedle.style.transform = `rotate(${state.steerDeg}deg)`;
  if (elDialVal) elDialVal.textContent = `${state.steerDeg}°`;
  if (elSteerDial) elSteerDial.setAttribute('aria-valuenow', state.steerDeg);

  const budget = computeRfLinkBudget();
  const elWl = byId('telemetry-wavelength');
  if (elWl) elWl.textContent = budget.wavelength.toFixed(3) + ' m';
  const elFspl = byId('telemetry-fspl');
  if (elFspl) elFspl.textContent = budget.fsplDb.toFixed(1) + ' dB';
  const elDir = byId('telemetry-directivity');
  if (elDir) elDir.textContent = '+' + budget.directivityDbi.toFixed(1) + ' dBi';
  const elMarg = byId('telemetry-margin');
  if (elMarg) {
    const sign = budget.linkMarginDb >= 0 ? '+' : '';
    elMarg.textContent = `${sign}${budget.linkMarginDb.toFixed(1)} dB`;
  }

  const matButtons = typeof document !== 'undefined' ? document.querySelectorAll('.mat-cell') : [];
  matButtons.forEach((btn) => {
    if (btn.getAttribute('data-brush') === state.brush) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const selectBrush = byId('select-brush');
  if (selectBrush) selectBrush.value = state.brush;
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

export function renderPolarAzimuthOverlay(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  if (!state.showAzimuthGrid) return;

  const originX = Math.floor(state.txX * width);
  const originY = Math.floor(state.txY * height);

  ctx.save();
  ctx.lineWidth = 1.0;
  ctx.strokeStyle = 'rgba(51, 255, 102, 0.22)';
  ctx.fillStyle = 'rgba(51, 255, 102, 0.6)';
  ctx.font = '8px monospace';

  const rings = [30, 60, 90, 130, 180];
  rings.forEach((r, idx) => {
    ctx.beginPath();
    ctx.arc(originX, originY, r, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fillText(`${(idx + 1) * 25}m`, originX + r + 2, originY - 2);
  });

  const anglesDeg = [-60, -45, -30, -15, 0, 15, 30, 45, 60];
  const maxR = 190;
  anglesDeg.forEach((deg) => {
    const rad = (deg * Math.PI) / 180.0;
    const endX = originX + maxR * Math.cos(rad);
    const endY = originY + maxR * Math.sin(rad);
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  });

  const steerRad = (state.steerDeg * Math.PI) / 180.0;
  const beamX = originX + 210 * Math.cos(steerRad);
  const beamY = originY + 210 * Math.sin(steerRad);

  ctx.strokeStyle = 'rgba(255, 179, 0, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(beamX, beamY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(255, 179, 0, 0.9)';
  ctx.fillText(`BEAM ${state.steerDeg}°`, beamX - 20, Math.max(12, beamY - 4));

  ctx.fillStyle = '#33ff66';
  ctx.beginPath();
  ctx.arc(originX, originY, 3, 0, 2 * Math.PI);
  ctx.fill();

  ctx.restore();
}

export function setupEventListeners(canvas) {
  if (typeof document === 'undefined') return;
  const on = (id, evt, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(evt, fn);
  };
  on('select-preset', 'change', (e) => loadPreset(e.target.value));
  on('select-brush', 'change', (e) => {
    state.brush = e.target.value;
    syncUiFromState();
  });
  on('slider-freq', 'input', (e) => {
    state.freqGhz = parseFloat(e.target.value);
    updateGridDx();
    syncUiFromState();
  });
  on('slider-elements', 'input', (e) => {
    state.elements = parseInt(e.target.value, 10);
    syncUiFromState();
  });
  on('slider-steer', 'input', (e) => {
    state.steerDeg = parseInt(e.target.value, 10);
    syncUiFromState();
  });
  on('select-view', 'change', (e) => {
    state.viewMode = e.target.value;
  });
  on('btn-pause', 'click', (e) => {
    state.paused = !state.paused;
    e.target.textContent = state.paused ? 'Resume' : 'Pause';
  });
  on('btn-reset', 'click', () => state.solver.reset());
  on('btn-clear-walls', 'click', () => {
    state.solver.materials.fill(0);
    state.solver.reset();
  });

  on('chk-azimuth-grid', 'change', (e) => {
    state.showAzimuthGrid = e.target.checked;
  });
  on('chk-scanlines', 'change', (e) => {
    state.showScanlines = e.target.checked;
    if (state.showScanlines) {
      document.body.classList.remove('scanlines-disabled');
    } else {
      document.body.classList.add('scanlines-disabled');
    }
  });

  const matButtons = document.querySelectorAll('.mat-cell');
  matButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const b = btn.getAttribute('data-brush');
      state.brush = b;
      syncUiFromState();
    });
  });

  const steeringDial = document.getElementById('antenna-steering-dial');
  if (steeringDial) {
    let isDraggingDial = false;
    const updateDialAngle = (clientX, clientY) => {
      const rect = steeringDial.getBoundingClientRect();
      const cx = rect.left + rect.width / 2.0;
      const cy = rect.top + rect.height / 2.0;
      const dx = clientX - cx;
      const dy = clientY - cy;
      let angle = Math.atan2(dx, -dy) * (180.0 / Math.PI);
      angle = Math.max(-60, Math.min(60, Math.round(angle)));
      state.steerDeg = angle;
      syncUiFromState();
    };

    steeringDial.addEventListener('mousedown', (e) => {
      isDraggingDial = true;
      updateDialAngle(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
      if (isDraggingDial) {
        updateDialAngle(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mouseup', () => {
      isDraggingDial = false;
    });

    steeringDial.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        state.steerDeg = Math.max(-60, state.steerDeg - 1);
        syncUiFromState();
        e.preventDefault();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        state.steerDeg = Math.min(60, state.steerDeg + 1);
        syncUiFromState();
        e.preventDefault();
      }
    });
  }

  canvas.addEventListener('mousedown', (e) => {
    state.isDrawing = true;
    handlePointerAction(e, canvas);
  });
  canvas.addEventListener('mousemove', (e) => {
    if (state.isDrawing) handlePointerAction(e, canvas);
    else {
      const { gx, gy } = getCanvasPointerCell(e, canvas);
      const p = state.solver.probeDbm(gx, gy);
      const elP = document.getElementById('telemetry-probe');
      if (elP) elP.textContent = `${p.dbm.toFixed(1)} dBm (|Ez| ${p.ezAbs.toFixed(2)} V/m)`;
    }
  });
  window.addEventListener('mouseup', () => {
    state.isDrawing = false;
  });
}

export async function main() {
  if (typeof document === 'undefined') return;
  const canvas = document.getElementById('sim-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d'), imgData = ctx.createImageData(SIM_WIDTH, SIM_HEIGHT);

  const polarCanvas = document.getElementById('radar-polar-canvas');
  const polarCtx = polarCanvas ? polarCanvas.getContext('2d') : null;

  setupEventListeners(canvas);
  loadPreset(state.presetId);

  const engineBadge = document.getElementById('telemetry-engine');
  try {
    const gpu = await initWebGpuFdtd(SIM_WIDTH, SIM_HEIGHT);
    if (gpu) {
      state.gpuBackend = gpu;
      if (engineBadge) {
        engineBadge.textContent = 'CPU FDTD (WebGPU Ready)';
        engineBadge.style.color = '#33ff66';
      }
    } else if (engineBadge) {
      engineBadge.textContent = 'CPU FDTD';
    }
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

    if (polarCtx) {
      renderPolarAzimuthOverlay(polarCtx, SIM_WIDTH, SIM_HEIGHT);
    }

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
