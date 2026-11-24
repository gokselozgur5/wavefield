//! Excitation source waveforms for FDTD grid injection.

/// Excitation source waveform for FDTD grid injection.
#[derive(Debug, Clone)]
pub enum SourceWaveform {
    /// Continuous wave sinusoid: `amplitude * sin(2 * pi * freq * t + phase)`.
    ContinuousWave {
        freq_hz: f64,
        amplitude: f64,
        phase_rad: f64,
    },
    /// Ricker wavelet (second derivative of Gaussian) with peak frequency `freq_hz`.
    RickerWavelet {
        freq_hz: f64,
        amplitude: f64,
        delay_s: f64,
    },
}

impl SourceWaveform {
    /// Evaluate waveform amplitude at time `t_s`.
    #[inline]
    pub fn sample(&self, t_s: f64) -> f64 {
        match *self {
            Self::ContinuousWave {
                freq_hz,
                amplitude,
                phase_rad,
            } => amplitude * (2.0 * std::f64::consts::PI * freq_hz * t_s + phase_rad).sin(),
            Self::RickerWavelet {
                freq_hz,
                amplitude,
                delay_s,
            } => {
                let tau = std::f64::consts::PI * freq_hz * (t_s - delay_s);
                let tau_sq = tau * tau;
                amplitude * (1.0 - 2.0 * tau_sq) * (-tau_sq).exp()
            }
        }
    }
}
