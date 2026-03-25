mod tray;

use tauri::Manager;

#[tauri::command]
async fn start_dragging(window: tauri::Window) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![start_dragging])
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcut("CommandOrControl+Shift+R")
                .unwrap()
                .with_handler(|app, _shortcut, event| {
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 버전 변경 시 WebView2 cache 초기화
            let app_data = app.path().app_local_data_dir()?;
            let version_file = app_data.join("last_version");
            let current_version = app.config().version.clone().unwrap_or_default();
            let should_clear = match std::fs::read_to_string(&version_file) {
                Ok(v) => v.trim() != current_version,
                Err(_) => true,
            };

            tray::create_tray(app.handle())?;

            // 시작 시 창 표시
            if let Some(window) = app.get_webview_window("main") {
                if should_clear {
                    let _ = window.clear_all_browsing_data();
                    let _ = std::fs::write(&version_file, &current_version);
                }
                let _ = window.show();
                let _ = window.set_focus();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
