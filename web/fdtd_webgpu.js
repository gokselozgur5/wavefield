export const WGSL_FDTD_SOURCE = /* wgsl */ `
struct SimParams {
  width: u32,
  height: u32,
  cDtDx: f32,
  subSteps: u32,
};

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var<storage, read_write> ez: array<f32>;
@group(0) @binding(2) var<storage, read_write> hx: array<f32>;
@group(0) @binding(3) var<storage, read_write> hy: array<f32>;
@group(0) @binding(4) var<storage, read> materials: array<u32>;

@compute @workgroup_size(8, 8)
fn update_h(@builtin(global_invocation_id) id: vec3<u32>) {
  let x = id.x;
  let y = id.y;
  let w = params.width;
  let h = params.height;
  if (x < w && y < (h - 1u)) {
    let diff = ez[(y + 1u) * w + x] - ez[y * w + x];
    hx[y * w + x] = hx[y * w + x] - params.cDtDx * diff;
  }
  if (x < (w - 1u) && y < h) {
    let diff = ez[y * w + (x + 1u)] - ez[y * w + x];
    let hyW = w - 1u;
    hy[y * hyW + x] = hy[y * hyW + x] + params.cDtDx * diff;
  }
}
`;

export const WGSL_E_UPDATE = /* wgsl */ `
@compute @workgroup_size(8, 8)
fn update_e(@builtin(global_invocation_id) id: vec3<u32>) {
  let x = id.x;
  let y = id.y;
  let w = params.width;
  let h = params.height;
  if (x == 0u || x >= (w - 1u) || y == 0u || y >= (h - 1u)) {
    return;
  }
  let idx = y * w + x;
  let hyW = w - 1u;
  let curlH = (hy[y * hyW + x] - hy[y * hyW + (x - 1u)]) - (hx[y * w + x] - hx[(y - 1u) * w + x]);
  let mat = materials[idx];
  var ca = 1.0;
  var cb = params.cDtDx;
  if (mat == 5u) {
    ca = 0.0;
    cb = 0.0;
  } else if (mat == 4u) {
    ca = 0.98;
    cb = params.cDtDx * 0.18;
  }
  ez[idx] = ca * ez[idx] + cb * curlH;
}
`;

export async function initWebGpuFdtd(width, height) {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    return null;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return null;
    const device = await adapter.requestDevice();
    const shaderModule = device.createShaderModule({
      code: WGSL_FDTD_SOURCE + '\n' + WGSL_E_UPDATE,
    });
    return {
      device,
      shaderModule,
      width,
      height,
      type: 'WebGPU WGSL',
    };
  } catch (_err) {
    return null;
  }
}
