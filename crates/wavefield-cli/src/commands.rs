use crate::rf;
use wavefield_core::array::PhasedArray;

fn arg<T: std::str::FromStr>(args: &[String], k: &str) -> Result<T, String> {
    let v = args
        .windows(2)
        .find(|w| w[0] == k)
        .ok_or(format!("missing {k}"))?;
    v[1].parse().map_err(|_| format!("invalid {k}"))
}

pub fn run_link(args: &[String], json: bool) -> Result<String, String> {
    let r = rf::link_budget(
        arg(args, "--freq-ghz")?,
        arg(args, "--dist-km")?,
        arg(args, "--tx-dbm")?,
    )?;
    if json {
        Ok(format!(
            "{{\"fspl_db\":{:.4},\"rx_power_dbm\":{:.4},\"fresnel_r1_m\":{:.4}}}",
            r.fspl_db, r.rx_power_dbm, r.fresnel_r1_m
        ))
    } else {
        Ok(format!(
            "FSPL: {:.2} dB | Rx: {:.2} dBm | Fresnel R1: {:.2} m",
            r.fspl_db, r.rx_power_dbm, r.fresnel_r1_m
        ))
    }
}

pub fn run_array(args: &[String], json: bool) -> Result<String, String> {
    let n: usize = arg(args, "--elements")?;
    let s: f64 = arg(args, "--spacing-lambda")?;
    let a: f64 = arg(args, "--steer-deg")?;
    if n == 0 || !s.is_finite() || s <= 0.0 || !a.is_finite() {
        return Err("invalid array parameters".into());
    }
    let arr = PhasedArray::new(n, s, a);
    let dp = arr.progressive_phase_shift_rad();
    let pk = arr.array_factor_db(a, -60.0);
    let br = arr.array_factor_db(0.0, -60.0);
    if json {
        Ok(format!(
            "{{\"phase_shift_rad\":{dp:.6},\"steer_af_db\":{pk:.4},\"broadside_af_db\":{br:.4}}}"
        ))
    } else {
        Ok(format!(
            "Phase shift: {dp:.4} rad | Steer AF: {pk:.2} dB | Broadside AF: {br:.2} dB"
        ))
    }
}
