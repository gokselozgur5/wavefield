//! Electromagnetic and RF material property catalog.

/// Physical constant: speed of light in vacuum (m/s).
pub const SPEED_OF_LIGHT: f64 = 299_792_458.0;

/// Physical constant: vacuum permittivity epsilon_0 (F/m).
pub const EPSILON_0: f64 = 8.854_187_812_8e-12;

/// Physical constant: vacuum permeability mu_0 (H/m).
pub const MU_0: f64 = 1.256_637_062_12e-6;

/// Material classification for RF obstacles and mediums.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[repr(u8)]
pub enum MaterialKind {
    FreeSpace = 0,
    Drywall = 1,
    Glass = 2,
    Foliage = 3,
    Concrete = 4,
    Metal = 5,
}

/// Electromagnetic constitutive parameters of a medium.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MaterialProperties {
    /// Relative permittivity (dimensionless).
    pub eps_r: f64,
    /// Conductivity in Siemens per meter (S/m).
    pub sigma_s_m: f64,
}

impl MaterialKind {
    /// Returns default RF constitutive parameters at standard microwave frequencies (~2-10 GHz).
    #[inline]
    pub const fn properties(self) -> MaterialProperties {
        match self {
            Self::FreeSpace => MaterialProperties {
                eps_r: 1.0,
                sigma_s_m: 0.0,
            },
            Self::Drywall => MaterialProperties {
                eps_r: 2.2,
                sigma_s_m: 0.015,
            },
            Self::Glass => MaterialProperties {
                eps_r: 6.0,
                sigma_s_m: 0.005,
            },
            Self::Foliage => MaterialProperties {
                eps_r: 1.3,
                sigma_s_m: 0.05,
            },
            Self::Concrete => MaterialProperties {
                eps_r: 5.5,
                sigma_s_m: 0.12,
            },
            Self::Metal => MaterialProperties {
                eps_r: 1.0,
                sigma_s_m: 1.0e7,
            },
        }
    }

    /// Wave propagation phase velocity in meters per second.
    #[inline]
    pub fn phase_velocity_m_s(self) -> f64 {
        let props = self.properties();
        SPEED_OF_LIGHT / props.eps_r.sqrt()
    }

    /// Normal incidence power reflection coefficient R from free space into this medium.
    #[inline]
    pub fn normal_power_reflection_coeff(self) -> f64 {
        let n = self.properties().eps_r.sqrt();
        let r_ampl = (n - 1.0) / (n + 1.0);
        r_ampl * r_ampl
    }

    /// Approximate attenuation constant alpha in Nepers/meter for low-loss or general dielectrics.
    #[inline]
    pub fn attenuation_neper_per_m(self) -> f64 {
        let props = self.properties();
        if props.sigma_s_m <= 0.0 {
            return 0.0;
        }
        let eta = (MU_0 / (EPSILON_0 * props.eps_r)).sqrt();
        0.5 * props.sigma_s_m * eta
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_free_space_velocity_and_reflection() {
        let free = MaterialKind::FreeSpace;
        assert!((free.phase_velocity_m_s() - SPEED_OF_LIGHT).abs() < 1e-3);
        assert_eq!(free.normal_power_reflection_coeff(), 0.0);
        assert_eq!(free.attenuation_neper_per_m(), 0.0);
    }

    #[test]
    fn test_dielectric_reflection_and_attenuation() {
        let concrete = MaterialKind::Concrete;
        assert!(concrete.phase_velocity_m_s() < SPEED_OF_LIGHT);
        assert!(concrete.normal_power_reflection_coeff() > 0.0);
        assert!(concrete.attenuation_neper_per_m() > 0.0);
    }

    #[test]
    fn test_metal_high_conductivity() {
        let metal = MaterialKind::Metal;
        assert!(metal.attenuation_neper_per_m() > 1000.0);
        let r_metal = metal.normal_power_reflection_coeff();
        assert!(
            (r_metal - 1.0).abs() < 1e-3,
            "Metal normal reflection coefficient must be ~1.0, got {r_metal}"
        );
    }
}
