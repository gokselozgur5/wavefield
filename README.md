# wavefield

Real-Time 3D RF and Radar Wave Propagation Simulator.

## Architecture

- `crates/wavefield-core`: Zero-dependency Rust and WebAssembly physics core.
  - Maxwell 2D TMz FDTD wave solver with Mur first-order absorbing boundary conditions.
  - Phased-array beamforming and analytical array factor synthesis.
  - Multipath RF link budget engine (Friis path loss, knife-edge diffraction).
  - Deterministic dBm-to-RGBA8 field visualization and C ABI exports.

## Live Interactive Web Simulator

Launch the live interactive web simulator deployed on GitHub Pages:
[https://gokselozgur5.github.io/wavefield/](https://gokselozgur5.github.io/wavefield/)

### Web Simulation Features
- **Dual Engine Execution:** Real WebGPU WGSL compute shader backend (`@compute @workgroup_size(8, 8)`) with zero-blank automatic CPU FDTD canvas fallback.
- **RF & Radar Scenarios:** 4 built-in presets including Urban 5G Canyon, Indoor Wi-Fi Floorplan, 5.8 GHz FPV Drone Link, and 10 GHz X-Band Radar.
- **Interactive Controls:** Steerable phased-array antenna synthesis (1-8 elements, -60 to +60 deg beam tilt), live wall drawing brush (Metal, Concrete, Glass, Foliage), and live point dBm/field probe.
- **Visual Modes:** Instant switching between 2D power density heatmap and 2.5D shaded wave relief.
- **Zero CDN Dependencies:** Completely self-contained, offline-capable vanilla JS ES modules.

### Local Run Instructions
Run locally with any static web server:
```bash
python3 -m http.server 8080
```
Open `http://localhost:8080` in Chrome, Safari, Firefox, or Edge.
