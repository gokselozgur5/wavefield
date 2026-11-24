use crate::materials::MaterialKind;
use crate::propagation::*;

#[test]
fn test_rf_band_frequencies_and_wavelength() {
    let wifi = RfBand::Wifi24GHz;
    assert_eq!(wifi.frequency_hz(), 2.4e9);
    assert!((wifi.wavelength_m() - 0.125).abs() < 1e-3);

    let fpv = RfBand::Fpv58GHz;
    assert_eq!(fpv.frequency_hz(), 5.8e9);
    assert!(fpv.wavelength_m() < wifi.wavelength_m());
}

#[test]
fn test_friis_fspl_inverse_square_law() {
    let f = 2.4e9;
    let l_1m = fspl_db(1.0, f);
    let l_2m = fspl_db(2.0, f);
    let l_4m = fspl_db(4.0, f);

    assert!((l_2m - l_1m - 6.0206).abs() < 1e-2);
    assert!((l_4m - l_2m - 6.0206).abs() < 1e-2);
}

#[test]
fn test_knife_edge_diffraction_monotonic() {
    let loss_shadow = knife_edge_loss_db(1.0);
    let loss_los = knife_edge_loss_db(-0.5);
    assert!(loss_shadow > loss_los);
}

#[test]
fn test_multipath_rx_power() {
    let rx_dbm = compute_multipath_rx_dbm(20.0, 10.0, 12.0, MaterialKind::Concrete, 2.4e9);
    assert!(rx_dbm.is_finite());
    assert!(rx_dbm < 20.0);
}

#[test]
fn test_fspl_guards_and_non_negative() {
    assert_eq!(fspl_db(0.0, 2.4e9), 0.0);
    assert_eq!(fspl_db(-5.0, 2.4e9), 0.0);
    assert_eq!(fspl_db(f64::NAN, 2.4e9), 0.0);
    assert_eq!(fspl_db(1.0, 0.0), 0.0);
    assert_eq!(fspl_db(1.0, -100.0), 0.0);
    assert_eq!(fspl_db(1.0, f64::INFINITY), 0.0);
    // When distance is very small (near field < lambda/(4pi)), fspl clamped >= 0.0
    assert_eq!(fspl_db(0.001, 2.4e9), 0.0);
}

#[test]
fn test_knife_edge_itu_r_p526() {
    assert_eq!(knife_edge_loss_db(-1.0), 0.0);
    assert_eq!(knife_edge_loss_db(-0.78), 0.0);
    let l_mid = knife_edge_loss_db(0.0);
    assert!(l_mid > 0.0 && (l_mid - 6.0).abs() < 1.0);
    let l_shadow = knife_edge_loss_db(2.0);
    assert!(l_shadow > l_mid);
}

#[test]
fn test_multipath_phase_inversion_at_zero_path_diff() {
    // If refl_dist == direct_dist, direct and reflected waves travel same distance.
    // With phase inversion (reflection from denser medium / Metal, Gamma < 0, phi_refl = PI),
    // they destructively interfere!
    let rx_metal = compute_multipath_rx_dbm(20.0, 10.0, 10.0, MaterialKind::Metal, 2.4e9);
    let rx_direct_only = 20.0 - fspl_db(10.0, 2.4e9);
    assert!(
        rx_metal < rx_direct_only - 20.0,
        "Destructive interference must occur when path difference is 0 and reflection phase inverts: rx_metal={rx_metal}, rx_direct={rx_direct_only}"
    );
}
