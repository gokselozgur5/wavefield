use crate::wasm_abi::*;

#[test]
fn test_wasm_abi_lifecycle() {
    let ptr = wavefield_grid_create(10, 10, 0.05);
    assert!(!ptr.is_null());
    unsafe {
        wavefield_grid_inject_cw(ptr, 5, 5, 2.4e9, 1.0, 0.0);
        wavefield_grid_step(ptr);
        let ez_buf = wavefield_grid_ez_ptr(ptr);
        assert!(!ez_buf.is_null());

        let mut out = vec![0u8; 10 * 10 * 4];
        wavefield_render_rgba(ptr, out.as_mut_ptr(), out.len(), -60.0, 0.0);
        assert_eq!(out[3], 255);

        wavefield_grid_destroy(ptr);
    }
}

#[test]
fn test_wasm_alloc_free_bytes() {
    unsafe {
        let ptr = wavefield_alloc_bytes(1024);
        assert!(!ptr.is_null());
        wavefield_free_bytes(ptr, 1024);

        let zero_ptr = wavefield_alloc_bytes(0);
        assert!(zero_ptr.is_null());
        wavefield_free_bytes(std::ptr::null_mut(), 0);
    }
}

#[test]
fn test_wasm_abi_invalid_inputs_return_null() {
    let p1 = wavefield_grid_create(3, 10, 0.05);
    assert!(p1.is_null());
    let p2 = wavefield_grid_create(10, 2, 0.05);
    assert!(p2.is_null());
    let p3 = wavefield_grid_create(10, 10, -0.05);
    assert!(p3.is_null());
    let p4 = wavefield_grid_create(10, 10, f64::NAN);
    assert!(p4.is_null());
    let p5 = wavefield_grid_create(10, 10, f64::INFINITY);
    assert!(p5.is_null());
    let p6 = wavefield_grid_create(5_000_000, 5_000_000, 0.05);
    assert!(p6.is_null());
}
