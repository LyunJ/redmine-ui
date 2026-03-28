fn main() {
    // 빌드 시마다 고유한 타임스탬프를 환경변수로 주입
    println!(
        "cargo:rustc-env=BUILD_TIMESTAMP={}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
    );
    tauri_build::build()
}
