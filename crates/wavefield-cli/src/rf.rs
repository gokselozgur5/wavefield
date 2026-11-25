//! Pure RF link-budget and first Fresnel zone calculations.

use wavefield_core::{materials::SPEED_OF_LIGHT, propagation::fspl_db};

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LinkBudget {
    pub fspl_db: f64,
    pub rx_power_dbm: f64,
    pub fresnel_r1_m: f64,
}

pub fn fresnel_r1_m(freq_ghz: f64, dist_km: f64) -> f64 {
    0.5 * ((SPEED_OF_LIGHT / (freq_ghz * 1e9)) * dist_km * 1000.0).sqrt()
}

pub fn link_budget(freq_ghz: f64, dist_km: f64, tx_dbm: f64) -> Result<LinkBudget, &'static str> {
    if !(freq_ghz.is_finite() && freq_ghz > 0.0 && dist_km.is_finite() && dist_km > 0.0) {
        return Err("frequency and distance must be positive");
    }
    if !tx_dbm.is_finite() {
        return Err("tx power must be finite");
    }
    let fspl = fspl_db(dist_km * 1000.0, freq_ghz * 1e9);
    Ok(LinkBudget {
        fspl_db: fspl,
        rx_power_dbm: tx_dbm - fspl,
        fresnel_r1_m: fresnel_r1_m(freq_ghz, dist_km),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn computes_24ghz_1km_budget() {
        let r = link_budget(2.4, 1.0, 20.0).unwrap();
        assert!((r.fspl_db - 100.052).abs() < 0.05);
        assert!((r.rx_power_dbm + 80.052).abs() < 0.05);
        assert!((r.fresnel_r1_m - 5.59).abs() < 0.05);
    }

    #[test]
    fn rejects_invalid_inputs() {
        assert!(link_budget(0.0, 1.0, 20.0).is_err());
        assert!(link_budget(2.4, -1.0, 20.0).is_err());
        assert!(link_budget(2.4, 1.0, f64::NAN).is_err());
    }
}
