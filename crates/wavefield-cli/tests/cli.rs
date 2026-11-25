use std::process::Command;

fn run(args: &[&str]) -> std::process::Output {
    Command::new(env!("CARGO_BIN_EXE_wavefield"))
        .args(args)
        .output()
        .expect("run wavefield")
}

#[test]
fn link_budget_json_output() {
    let out = run(&[
        "link-budget",
        "--freq-ghz",
        "2.4",
        "--dist-km",
        "1.0",
        "--tx-dbm",
        "20.0",
        "--json",
    ]);
    assert!(out.status.success());
    let s = String::from_utf8_lossy(&out.stdout);
    assert!(s.contains("\"fspl_db\":") && s.contains("\"rx_power_dbm\":"));
}

#[test]
fn array_json_and_invalid_usage() {
    let ok = run(&[
        "array",
        "--elements",
        "8",
        "--spacing-lambda",
        "0.5",
        "--steer-deg",
        "30",
        "--json",
    ]);
    assert!(ok.status.success());
    let s = String::from_utf8_lossy(&ok.stdout);
    assert!(s.contains("\"phase_shift_rad\":") && s.contains("\"steer_af_db\":"));
    let bad = run(&["unknown"]);
    assert!(!bad.status.success());
}

#[test]
fn fresnel_json_and_invalid_obstacle() {
    let ok = run(&[
        "fresnel",
        "--freq-ghz",
        "2.4",
        "--dist-km",
        "1.0",
        "--obstacle-dist-km",
        "0.5",
        "--obstacle-height-m",
        "1.0",
        "--json",
    ]);
    assert!(ok.status.success());
    let s = String::from_utf8_lossy(&ok.stdout);
    assert!(s.contains("\"r1_m\":") && s.contains("\"clear_60pct\":true"));
    let bad = run(&[
        "fresnel",
        "--freq-ghz",
        "2.4",
        "--dist-km",
        "1.0",
        "--obstacle-dist-km",
        "1.5",
        "--obstacle-height-m",
        "1.0",
    ]);
    assert!(!bad.status.success());
}
