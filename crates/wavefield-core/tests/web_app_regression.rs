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

    let presets_src = fs::read_to_string(repo_root.join("web/presets.js")).unwrap();
    assert!(presets_src.contains("urban-5g"));
    assert!(presets_src.contains("indoor-wifi"));
    assert!(presets_src.contains("fpv-drone"));
    assert!(presets_src.contains("naval-radar"));
}
