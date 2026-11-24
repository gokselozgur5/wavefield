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
