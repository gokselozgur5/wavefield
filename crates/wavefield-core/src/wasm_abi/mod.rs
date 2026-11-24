//! C-compatible ABI exports for WebAssembly runtime memory sharing.

use crate::fdtd::{FdtdGrid, SourceWaveform};
use crate::heatmap::render_field_rgba;
use crate::materials::MaterialKind;

/// Allocate and initialize a new FdtdGrid on the heap.
#[no_mangle]
pub extern "C" fn wavefield_grid_create(width: usize, height: usize, dx_m: f64) -> *mut FdtdGrid {
    let grid = Box::new(FdtdGrid::new(width, height, dx_m));
    Box::into_raw(grid)
}

/// Destroy a previously created FdtdGrid.
///
/// # Safety
/// Must only be called once with a valid pointer returned by `wavefield_grid_create`.
#[no_mangle]
pub unsafe extern "C" fn wavefield_grid_destroy(ptr: *mut FdtdGrid) {
    if !ptr.is_null() {
        drop(Box::from_raw(ptr));
    }
}

/// Advance grid simulation by one step.
///
/// # Safety
/// `ptr` must be a non-null pointer to an initialized `FdtdGrid`.
#[no_mangle]
pub unsafe extern "C" fn wavefield_grid_step(ptr: *mut FdtdGrid) {
    if let Some(grid) = ptr.as_mut() {
        grid.step();
    }
}

/// Set a rectangular region to a specified material.
///
/// # Safety
/// `ptr` must be a non-null pointer to an initialized `FdtdGrid`.
#[no_mangle]
pub unsafe extern "C" fn wavefield_grid_set_material(
    ptr: *mut FdtdGrid,
    x0: usize,
    y0: usize,
    x1: usize,
    y1: usize,
    material_tag: u8,
) {
    if let Some(grid) = ptr.as_mut() {
        let mat = match material_tag {
            1 => MaterialKind::Drywall,
            2 => MaterialKind::Glass,
            3 => MaterialKind::Foliage,
            4 => MaterialKind::Concrete,
            5 => MaterialKind::Metal,
            _ => MaterialKind::FreeSpace,
        };
        grid.set_material_region(x0, y0, x1, y1, mat);
    }
}

/// Inject a continuous-wave point source into `(x, y)`.
///
/// # Safety
/// `ptr` must be a non-null pointer to an initialized `FdtdGrid`.
#[no_mangle]
pub unsafe extern "C" fn wavefield_grid_inject_cw(
    ptr: *mut FdtdGrid,
    x: usize,
    y: usize,
    freq_hz: f64,
    amplitude: f64,
    phase_rad: f64,
) {
    if let Some(grid) = ptr.as_mut() {
        let src = SourceWaveform::ContinuousWave {
            freq_hz,
            amplitude,
            phase_rad,
        };
        grid.inject_source(x, y, &src);
    }
}

/// Return a raw pointer to the electric field buffer `ez`.
///
/// # Safety
/// `ptr` must be a non-null pointer to an initialized `FdtdGrid`.
#[no_mangle]
pub unsafe extern "C" fn wavefield_grid_ez_ptr(ptr: *const FdtdGrid) -> *const f64 {
    if let Some(grid) = ptr.as_ref() {
        grid.ez.as_ptr()
    } else {
        std::ptr::null()
    }
}

/// Render the electric field directly to an RGBA8 byte buffer.
///
/// # Safety
/// `ptr` must be non-null and `out_ptr` must point to `width * height * 4` bytes.
#[no_mangle]
pub unsafe extern "C" fn wavefield_render_rgba(
    ptr: *const FdtdGrid,
    out_ptr: *mut u8,
    min_dbm: f64,
    max_dbm: f64,
) {
    if let Some(grid) = ptr.as_ref() {
        if !out_ptr.is_null() {
            let len = grid.ez.len() * 4;
            let out_slice = std::slice::from_raw_parts_mut(out_ptr, len);
            render_field_rgba(&grid.ez, out_slice, min_dbm, max_dbm);
        }
    }
}

#[cfg(test)]
mod tests;
