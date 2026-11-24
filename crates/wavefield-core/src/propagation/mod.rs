//! RF link budget and multipath propagation models.

use crate::materials::{MaterialKind, SPEED_OF_LIGHT};

/// Preset RF frequency bands.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum RfBand {
    Wifi24GHz,
    Fpv58GHz,
    RadarXBand10GHz,
    Custom(f64),
}

impl RfBand {
    /// Center carrier frequency in Hertz.
    #[inline]
    pub const fn frequency_hz(self) -> f64 {
        match self {
            Self::Wifi24GHz => 2.4e9,
            Self::Fpv58GHz => 5.8e9,
            Self::RadarXBand10GHz => 10.0e9,
            Self::Custom(f) => f,
        }
    }

    /// Free-space wavelength in meters.
    #[inline]
    pub fn wavelength_m(self) -> f64 {
        SPEED_OF_LIGHT / self.frequency_hz()
    }
}

/// Free-Space Path Loss (FSPL) in decibels (dB) via the Friis transmission formula.
#[inline]
pub fn fspl_db(distance_m: f64, freq_hz: f64) -> f64 {
    if distance_m <= 0.0 || !distance_m.is_finite() || freq_hz <= 0.0 || !freq_hz.is_finite() {
        return 0.0;
    }
    let wavelength = SPEED_OF_LIGHT / freq_hz;
    let factor = 4.0 * std::f64::consts::PI * distance_m / wavelength;
    if factor <= 1.0 {
        return 0.0;
    }
    (20.0 * factor.log10()).max(0.0)
}

/// Knife-edge diffraction loss in dB via continuous monotonic ITU-R P.526-15.
pub fn knife_edge_loss_db(v: f64) -> f64 {
    if v <= -0.78 {
        0.0
    } else {
        let diff = v - 0.1;
        (6.9 + 20.0 * (diff.hypot(1.0) + diff).log10()).max(0.0)
    }
}

/// Compute multipath received power in dBm from direct and single-bounce reflected paths.
pub fn compute_multipath_rx_dbm(
    tx_power_dbm: f64,
    direct_dist_m: f64,
    refl_dist_m: f64,
    mat: MaterialKind,
    freq_hz: f64,
) -> f64 {
    let loss_direct = fspl_db(direct_dist_m, freq_hz);
    let p_direct_mw = 10.0f64.powf((tx_power_dbm - loss_direct) / 10.0);

    let r_coeff = mat.normal_power_reflection_coeff();
    let loss_refl = fspl_db(refl_dist_m, freq_hz);
    let p_refl_mw = 10.0f64.powf((tx_power_dbm - loss_refl) / 10.0) * r_coeff;

    let wavelength = SPEED_OF_LIGHT / freq_hz;
    let path_diff = refl_dist_m - direct_dist_m;
    let phi_refl = if mat == MaterialKind::FreeSpace {
        0.0
    } else {
        std::f64::consts::PI
    };
    let phase_diff = 2.0 * std::f64::consts::PI * path_diff / wavelength + phi_refl;

    let e_direct = p_direct_mw.sqrt();
    let e_refl = p_refl_mw.sqrt();
    let e_total_sq =
        e_direct * e_direct + e_refl * e_refl + 2.0 * e_direct * e_refl * phase_diff.cos();

    let p_total_mw = e_total_sq.max(1e-18);
    10.0 * p_total_mw.log10()
}

#[cfg(test)]
mod tests;
