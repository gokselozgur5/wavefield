//! Unit tests for 2D TMz FDTD solver and boundary absorption.

use super::*;
use crate::materials::{MaterialKind, SPEED_OF_LIGHT};

#[test]
fn test_fdtd_courant_stability() {
    let grid = FdtdGrid::new(50, 50, 0.05);
    let c = SPEED_OF_LIGHT;
    assert!(grid.dt_s <= grid.dx_m / (c * std::f64::consts::SQRT_2));
}

#[test]
fn test_fdtd_wave_radiation_and_absorption() {
    let mut grid = FdtdGrid::new(40, 40, 0.01);
    let src = SourceWaveform::RickerWavelet {
        freq_hz: 2.4e9,
        amplitude: 1.0,
        delay_s: 2.0 / 2.4e9,
    };

    for _ in 0..50 {
        grid.inject_source(20, 20, &src);
        grid.step();
    }

    let energy_mid = grid.total_electric_energy();
    assert!(energy_mid > 0.0, "Energy should radiate into grid");

    for _ in 0..150 {
        grid.step();
    }

    let energy_after = grid.total_electric_energy();
    assert!(energy_after.is_finite() && !energy_after.is_nan());
    assert!(
        energy_after < energy_mid,
        "Wave should dissipate through Mur absorbing boundary"
    );
}

#[test]
fn test_fdtd_metal_reflection_barrier() {
    let mut grid = FdtdGrid::new(50, 30, 0.01);
    grid.set_material_region(30, 5, 32, 25, MaterialKind::Metal);

    let src = SourceWaveform::ContinuousWave {
        freq_hz: 1.0e9,
        amplitude: 2.0,
        phase_rad: 0.0,
    };

    for _ in 0..80 {
        grid.inject_source(15, 15, &src);
        grid.step();
    }

    let ez_before = grid.ez[15 * grid.width + 25].abs();
    let ez_behind = grid.ez[15 * grid.width + 40].abs();
    assert!(
        ez_behind < ez_before,
        "Metal barrier should shield RF field: behind={ez_behind}, before={ez_before}"
    );
}

#[test]
fn test_fdtd_metal_pec_zeroing() {
    let mut grid = FdtdGrid::new(20, 20, 0.01);
    grid.set_material_region(8, 8, 12, 12, MaterialKind::Metal);
    let src = SourceWaveform::ContinuousWave {
        freq_hz: 2.4e9,
        amplitude: 5.0,
        phase_rad: 0.0,
    };
    for _ in 0..30 {
        grid.inject_source(5, 10, &src);
        grid.step();
    }
    for y in 8..12 {
        for x in 8..12 {
            let val = grid.ez[y * grid.width + x];
            assert_eq!(val, 0.0, "Metal cell ({x}, {y}) must remain strictly 0.0 (PEC)");
        }
    }
}
