//! Deterministic field magnitude (|Ez|) and dBm to RGBA8 thermal-RF LUT renderer.

/// Convert an electric field magnitude |Ez| in V/m to equivalent peak power density in dBm/m^2.
#[inline]
pub fn ez_to_dbm(ez_abs: f64) -> f64 {
    // 120 * pi approx 376.73031346177 (wave impedance of free space)
    let s = (ez_abs * ez_abs) / 376.73031346177;
    let p_mw = s * 1000.0;
    if p_mw <= 1e-15 {
        -120.0
    } else {
        (10.0 * p_mw.log10()).clamp(-120.0, 30.0)
    }
}

/// Map a normalized scalar in [0.0, 1.0] to a 4-byte RGBA color using a thermal/turbo gradient.
#[inline]
pub fn turbo_colormap_rgba(val: f64) -> [u8; 4] {
    let t = val.clamp(0.0, 1.0);
    // Smooth 4-stop gradient: deep blue -> cyan -> yellow -> intense red
    let r = if t < 0.25 {
        0.0
    } else if t < 0.5 {
        (t - 0.25) * 4.0 * 0.2
    } else if t < 0.75 {
        (t - 0.5) * 4.0 * 0.8 + 0.2
    } else {
        1.0
    };

    let g = if t < 0.25 {
        t * 4.0 * 0.8
    } else if t < 0.75 {
        0.8 + (t - 0.25) * 2.0 * 0.2
    } else {
        (1.0 - (t - 0.75) * 4.0) * 1.0
    };

    let b = if t < 0.25 {
        0.6 + t * 4.0 * 0.4
    } else if t < 0.5 {
        (1.0 - (t - 0.25) * 4.0) * 1.0
    } else {
        0.0
    };

    [
        (r.clamp(0.0, 1.0) * 255.0) as u8,
        (g.clamp(0.0, 1.0) * 255.0) as u8,
        (b.clamp(0.0, 1.0) * 255.0) as u8,
        255,
    ]
}

/// Map dBm value in range `[min_dbm, max_dbm]` to RGBA8 color tuple.
#[inline]
pub fn colorize_dbm_rgba(dbm: f64, min_dbm: f64, max_dbm: f64) -> [u8; 4] {
    if max_dbm <= min_dbm {
        return [0, 0, 0, 255];
    }
    let norm = (dbm - min_dbm) / (max_dbm - min_dbm);
    turbo_colormap_rgba(norm)
}

/// Render 2D electric field buffer `ez` into packed RGBA8 byte buffer.
pub fn render_field_rgba(ez: &[f64], out_rgba: &mut [u8], min_dbm: f64, max_dbm: f64) {
    assert_eq!(
        out_rgba.len(),
        ez.len() * 4,
        "Output buffer size must equal ez.len() * 4"
    );
    for (i, &field_val) in ez.iter().enumerate() {
        let dbm = ez_to_dbm(field_val.abs());
        let rgba = colorize_dbm_rgba(dbm, min_dbm, max_dbm);
        let pixel_offset = i * 4;
        out_rgba[pixel_offset..pixel_offset + 4].copy_from_slice(&rgba);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ez_to_dbm_monotonic() {
        let dbm_low = ez_to_dbm(0.001);
        let dbm_mid = ez_to_dbm(1.0);
        let dbm_high = ez_to_dbm(10.0);
        assert!(dbm_low < dbm_mid);
        assert!(dbm_mid < dbm_high);
    }

    #[test]
    fn test_ez_to_dbm_nan_inf_returns_floor() {
        assert_eq!(ez_to_dbm(f64::NAN), -120.0);
        assert_eq!(ez_to_dbm(f64::INFINITY), -120.0);
        assert_eq!(ez_to_dbm(f64::NEG_INFINITY), -120.0);
    }

    #[test]
    fn test_render_field_rgba_dimensions() {
        let ez = vec![0.0, 0.5, 1.0, 2.0];
        let mut out = vec![0u8; 16];
        render_field_rgba(&ez, &mut out, -60.0, 0.0);
        assert_eq!(out[3], 255);
        assert_eq!(out[7], 255);
        assert_eq!(out[11], 255);
        assert_eq!(out[15], 255);
    }
}
