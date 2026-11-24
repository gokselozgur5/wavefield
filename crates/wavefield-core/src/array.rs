//! Phased-array beamforming and radiation synthesis.

/// Uniform linear phased array of isotropic radiating elements.
#[derive(Debug, Clone, PartialEq)]
pub struct PhasedArray {
    pub num_elements: usize,
    pub spacing_wavelengths: f64,
    pub steer_deg: f64,
}

impl PhasedArray {
    /// Create a uniform linear array.
    pub fn new(num_elements: usize, spacing_wavelengths: f64, steer_deg: f64) -> Self {
        assert!(num_elements > 0, "Array must have at least 1 element");
        assert!(
            spacing_wavelengths > 0.0,
            "Element spacing must be positive"
        );
        Self {
            num_elements,
            spacing_wavelengths,
            steer_deg,
        }
    }

    /// Compute progressive phase shift delta between adjacent antenna elements in radians.
    #[inline]
    pub fn progressive_phase_shift_rad(&self) -> f64 {
        let steer_rad = self.steer_deg.to_radians();
        -2.0 * std::f64::consts::PI * self.spacing_wavelengths * steer_rad.sin()
    }

    /// Per-element phase offset in radians for element index `0 <= n < num_elements`.
    #[inline]
    pub fn element_phase_offset_rad(&self, element_idx: usize) -> f64 {
        element_idx as f64 * self.progressive_phase_shift_rad()
    }

    /// Normalized array factor amplitude (0.0 to 1.0) at observation angle `theta_deg`.
    pub fn array_factor(&self, theta_deg: f64) -> f64 {
        let theta_rad = theta_deg.to_radians();
        let k_d = 2.0 * std::f64::consts::PI * self.spacing_wavelengths;
        let delta = self.progressive_phase_shift_rad();

        let mut sum_re = 0.0;
        let mut sum_im = 0.0;
        for n in 0..self.num_elements {
            let psi = n as f64 * (k_d * theta_rad.sin() + delta);
            sum_re += psi.cos();
            sum_im += psi.sin();
        }

        let mag = (sum_re * sum_re + sum_im * sum_im).sqrt();
        mag / self.num_elements as f64
    }

    /// Normalized array factor power in decibels (dB), clamped to `min_db`.
    pub fn array_factor_db(&self, theta_deg: f64, min_db: f64) -> f64 {
        let af = self.array_factor(theta_deg);
        if af <= 1e-12 {
            min_db
        } else {
            (20.0 * af.log10()).max(min_db)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_broadside_beam_peak_at_zero() {
        let array = PhasedArray::new(8, 0.5, 0.0);
        let af_0 = array.array_factor_db(0.0, -60.0);
        let af_10 = array.array_factor_db(10.0, -60.0);
        assert!((af_0 - 0.0).abs() < 1e-3);
        assert!(af_10 < af_0 - 3.0);
    }

    #[test]
    fn test_steered_beam_peaks_at_30_and_minus_45() {
        let array_30 = PhasedArray::new(8, 0.5, 30.0);
        let peak_30 = array_30.array_factor_db(30.0, -60.0);
        let off_30 = array_30.array_factor_db(0.0, -60.0);
        assert!((peak_30 - 0.0).abs() < 1e-3);
        assert!(off_30 < peak_30 - 10.0);

        let array_neg45 = PhasedArray::new(8, 0.5, -45.0);
        let peak_neg45 = array_neg45.array_factor_db(-45.0, -60.0);
        let off_neg45 = array_neg45.array_factor_db(0.0, -60.0);
        assert!((peak_neg45 - 0.0).abs() < 1e-3);
        assert!(off_neg45 < peak_neg45 - 8.0);
    }
}
