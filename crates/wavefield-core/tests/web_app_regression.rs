use std::fs;
use std::path::Path;

#[test]
fn test_web_assets_exist_and_no_cdn() {
    let repo_root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap();

    let index_html = repo_root.join("index.html");
    assert!(index_html.exists(), "index.html must exist at root");
    let content = fs::read_to_string(&index_html).expect("failed to read index.html");

    assert!(!content.contains("https://cdn"));
    assert!(!content.contains("unpkg.com"));
    assert!(!content.contains("jsdelivr"));

    let web_dir = repo_root.join("web");
    let required_files = [
        "materials.js",
        "presets.js",
        "fdtd_cpu.js",
        "fdtd_webgpu.js",
        "styles.css",
        "app.js",
    ];

    for file_name in &required_files {
        let path = web_dir.join(file_name);
        assert!(path.exists(), "Missing required web asset: {}", file_name);
        let src = fs::read_to_string(&path).unwrap();
        assert!(!src.contains("https://cdn"));
        assert!(!src.contains("unpkg.com"));
        assert!(!src.contains("jsdelivr"));
    }
}

#[test]
fn test_web_content_covers_wgsl_and_presets() {
    let repo_root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap();

    let webgpu_src = fs::read_to_string(repo_root.join("web/fdtd_webgpu.js")).unwrap();
    assert!(webgpu_src.contains("@compute @workgroup_size(8, 8)"));
    assert!(webgpu_src.contains("initWebGpuFdtd"));

    let app_src = fs::read_to_string(repo_root.join("web/app.js")).unwrap();
    assert!(
        !app_src.contains("'WebGPU WGSL'"),
        "HUD badge must not claim executing WebGPU WGSL while loop uses CPU"
    );
    assert!(app_src.contains("CPU FDTD (WebGPU Ready)"));

    let presets_src = fs::read_to_string(repo_root.join("web/presets.js")).unwrap();
    assert!(presets_src.contains("urban-5g"));
    assert!(presets_src.contains("indoor-wifi"));
    assert!(presets_src.contains("fpv-drone"));
    assert!(presets_src.contains("naval-radar"));
}

#[test]
fn test_node_cpu_solver_runtime_smoke() {
    let repo_root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap();

    let node_script = r#"
        import('./web/fdtd_cpu.js').then(({ FdtdCpuSolver }) => {
            const solver = new FdtdCpuSolver(40, 40, 0.04);
            const img2d = { data: new Uint8ClampedArray(40 * 40 * 4) };
            solver.renderToImageData(img2d, '2d');
            const img25d = { data: new Uint8ClampedArray(40 * 40 * 4) };
            solver.renderToImageData(img25d, '25d');
            const sources = [{ x: 20, y: 20, amp: 2.0, freq: 2.4e9, phase: 0 }];
            for (let i = 0; i < 500; i++) {
                solver.step(1, sources);
            }
            let maxEz = 0;
            for (let i = 0; i < solver.ez.length; i++) {
                const v = Math.abs(solver.ez[i]);
                if (v > maxEz) maxEz = v;
            }
            if (!Number.isFinite(maxEz) || maxEz >= 1e3) {
                process.exit(2);
            }
        }).catch(err => {
            console.error(err);
            process.exit(1);
        });
    "#;

    let output = std::process::Command::new("node")
        .arg("--input-type=module")
        .arg("-e")
        .arg(node_script)
        .current_dir(repo_root)
        .output()
        .expect("Failed to execute node process");

    assert!(
        output.status.success(),
        "Node smoke test failed with stderr: {}",
        String::from_utf8_lossy(&output.stderr)
    );
}
