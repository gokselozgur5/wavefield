//! 2D TMz Maxwell Finite-Difference Time-Domain (FDTD) wave equation solver.

pub mod sources;

pub use sources::SourceWaveform;

use crate::materials::{MaterialKind, EPSILON_0, MU_0, SPEED_OF_LIGHT};

/// 2D TMz Maxwell FDTD grid.
pub struct FdtdGrid {
    pub width: usize,
    pub height: usize,
    pub dx_m: f64,
    pub dt_s: f64,
    pub step_count: u64,
    /// Electric field z-component Ez (V/m), sized width * height.
    pub ez: Vec<f64>,
    /// Magnetic field x-component Hx (A/m), sized width * (height - 1).
    pub hx: Vec<f64>,
    /// Magnetic field y-component Hy (A/m), sized (width - 1) * height.
    pub hy: Vec<f64>,
    /// Per-cell material classification, sized width * height.
    pub material_idx: Vec<u8>,
    pub ez_prev_left: Vec<f64>,
    pub ez_prev_right: Vec<f64>,
    pub ez_prev_top: Vec<f64>,
    pub ez_prev_bottom: Vec<f64>,
}

impl FdtdGrid {
    /// Create a new 2D TMz FDTD grid satisfying Courant stability.
    pub fn new(width: usize, height: usize, dx_m: f64) -> Self {
        assert!(width >= 4 && height >= 4, "Grid dimensions must be at least 4x4");
        assert!(dx_m > 0.0, "Spatial step dx must be strictly positive");
        let dt_max = dx_m / (SPEED_OF_LIGHT * std::f64::consts::SQRT_2);
        let dt_s = dt_max * 0.98;
        Self {
            width,
            height,
            dx_m,
            dt_s,
            step_count: 0,
            ez: vec![0.0; width * height],
            hx: vec![0.0; width * (height - 1)],
            hy: vec![0.0; (width - 1) * height],
            material_idx: vec![MaterialKind::FreeSpace as u8; width * height],
            ez_prev_left: vec![0.0; height],
            ez_prev_right: vec![0.0; height],
            ez_prev_top: vec![0.0; width],
            ez_prev_bottom: vec![0.0; width],
        }
    }

    /// Set a rectangular region to a specific RF material.
    pub fn set_material_region(&mut self, x0: usize, y0: usize, x1: usize, y1: usize, mat: MaterialKind) {
        let max_x = x1.min(self.width);
        let max_y = y1.min(self.height);
        let tag = mat as u8;
        for y in y0..max_y {
            let row = y * self.width;
            for x in x0..max_x {
                self.material_idx[row + x] = tag;
            }
        }
    }

    /// Inject an excitation point source into cell `(x, y)`.
    #[inline]
    pub fn inject_source(&mut self, x: usize, y: usize, wave: &SourceWaveform) {
        if x < self.width && y < self.height {
            let t = self.step_count as f64 * self.dt_s;
            self.ez[y * self.width + x] += wave.sample(t);
        }
    }

    /// Compute total electric field energy in the grid.
    pub fn total_electric_energy(&self) -> f64 {
        self.ez.iter().map(|&v| v * v).sum::<f64>() * 0.5 * EPSILON_0 * (self.dx_m * self.dx_m)
    }
}
