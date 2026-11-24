# wavefield

Real-Time 3D RF and Radar Wave Propagation Simulator.

## Architecture

- `crates/wavefield-core`: Zero-dependency Rust and WebAssembly physics core.
  - Maxwell 2D TMz FDTD wave solver with Mur first-order absorbing boundary conditions.
  - Phased-array beamforming and analytical array factor synthesis.
  - Multipath RF link budget engine (Friis path loss, knife-edge diffraction).
  - Deterministic dBm-to-RGBA8 field visualization and C ABI exports.
