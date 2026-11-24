//! Time stepping and Mur boundary conditions for 2D TMz FDTD grid.

use super::FdtdGrid;
use crate::materials::{MaterialKind, EPSILON_0, MU_0, SPEED_OF_LIGHT};

impl FdtdGrid {
    /// Advance simulation by one FDTD time step using Yee staggered grid updates.
    pub fn step(&mut self) {
        let w = self.width;
        let h = self.height;
        let c_dt_dx = self.dt_s / (self.dx_m * MU_0);

        // Update Hx
        for y in 0..(h - 1) {
            let hx_row = y * w;
            let ez_row_curr = y * w;
            let ez_row_next = (y + 1) * w;
            for x in 0..w {
                let diff_ez = self.ez[ez_row_next + x] - self.ez[ez_row_curr + x];
                self.hx[hx_row + x] -= c_dt_dx * diff_ez;
            }
        }

        // Update Hy
        let hy_w = w - 1;
        for y in 0..h {
            let hy_row = y * hy_w;
            let ez_row = y * w;
            for x in 0..hy_w {
                let diff_ez = self.ez[ez_row + (x + 1)] - self.ez[ez_row + x];
                self.hy[hy_row + x] += c_dt_dx * diff_ez;
            }
        }

        // Update interior Ez
        for y in 1..(h - 1) {
            let ez_row = y * w;
            let hx_row_curr = y * w;
            let hx_row_prev = (y - 1) * w;
            let hy_row = y * hy_w;

            for x in 1..(w - 1) {
                let cell_idx = ez_row + x;
                let mat = match self.material_idx[cell_idx] {
                    1 => MaterialKind::Drywall,
                    2 => MaterialKind::Glass,
                    3 => MaterialKind::Foliage,
                    4 => MaterialKind::Concrete,
                    5 => MaterialKind::Metal,
                    _ => MaterialKind::FreeSpace,
                };
                let props = mat.properties();
                let eps = props.eps_r * EPSILON_0;
                let sigma = props.sigma_s_m;

                let ca = (1.0 - (sigma * self.dt_s) / (2.0 * eps)) / (1.0 + (sigma * self.dt_s) / (2.0 * eps));
                let cb = (self.dt_s / (eps * self.dx_m)) / (1.0 + (sigma * self.dt_s) / (2.0 * eps));

                let curl_h = (self.hy[hy_row + x] - self.hy[hy_row + (x - 1)])
                    - (self.hx[hx_row_curr + x] - self.hx[hx_row_prev + x]);

                self.ez[cell_idx] = ca * self.ez[cell_idx] + cb * curl_h;
            }
        }

        self.apply_mur_abc();
        self.step_count += 1;
    }

    /// Apply Mur 1st-order Absorbing Boundary Conditions (ABC) to all 4 boundaries.
    fn apply_mur_abc(&mut self) {
        let w = self.width;
        let h = self.height;
        let mur_coeff = (SPEED_OF_LIGHT * self.dt_s - self.dx_m) / (SPEED_OF_LIGHT * self.dt_s + self.dx_m);

        for y in 0..h {
            let row = y * w;
            let ez1 = self.ez[row + 1];
            let new_left = self.ez_prev_left[y] + mur_coeff * (ez1 - self.ez[row]);
            self.ez_prev_left[y] = ez1;
            self.ez[row] = new_left;

            let ez_in = self.ez[row + (w - 2)];
            let new_right = self.ez_prev_right[y] + mur_coeff * (ez_in - self.ez[row + (w - 1)]);
            self.ez_prev_right[y] = ez_in;
            self.ez[row + (w - 1)] = new_right;
        }

        for x in 0..w {
            let ez1 = self.ez[w + x];
            let new_top = self.ez_prev_top[x] + mur_coeff * (ez1 - self.ez[x]);
            self.ez_prev_top[x] = ez1;
            self.ez[x] = new_top;

            let ez_in = self.ez[(h - 2) * w + x];
            let new_bottom = self.ez_prev_bottom[x] + mur_coeff * (ez_in - self.ez[(h - 1) * w + x]);
            self.ez_prev_bottom[x] = ez_in;
            self.ez[(h - 1) * w + x] = new_bottom;
        }
    }
}
