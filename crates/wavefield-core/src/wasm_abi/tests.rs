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
        wavefield_render_rgba(ptr, out.as_mut_ptr(), -60.0, 0.0);
        assert_eq!(out[3], 255);

        wavefield_grid_destroy(ptr);
    }
}
