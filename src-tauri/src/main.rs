// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // WebView2 시작 전에 캐시 디렉토리 정리 (빌드 변경 시)
    if let Some(app_data) = dirs::data_local_dir() {
        let app_dir = app_data.join("com.tedle.redmine-ui");
        let version_file = app_dir.join("last_build");
        let build_id = env!("BUILD_TIMESTAMP");

        let should_clear = match std::fs::read_to_string(&version_file) {
            Ok(v) => v.trim() != build_id,
            Err(_) => true, // 파일 없음 = 이전 버전 또는 신규 설치. 신규는 EBWebView 없어서 무해
        };

        if should_clear {
            // EBWebView 캐시 디렉토리 삭제
            let cache_dir = app_dir.join("EBWebView");
            let _ = std::fs::remove_dir_all(&cache_dir);
        }

        // 빌드 ID 기록
        let _ = std::fs::create_dir_all(&app_dir);
        let _ = std::fs::write(&version_file, build_id);
    }

    redmine_ui_lib::run()
}
