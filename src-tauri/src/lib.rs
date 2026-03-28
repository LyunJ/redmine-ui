mod tray;

use tauri::Manager;

fn show_and_focus<R: tauri::Runtime>(window: &tauri::WebviewWindow<R>) {
    let _ = window.show();
    let _ = window.set_focus();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![])
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
                                show_and_focus(&window);
                            }
                        }
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // macOS: tray-icon feature가 activationPolicy를 자동으로 Accessory로 설정하여
            // 창이 show()되어도 키보드/마우스 이벤트를 받지 못하는 문제 수정.
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Regular);

            tray::create_tray(app.handle())?;

            if let Some(window) = app.get_webview_window("main") {
                show_and_focus(&window);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
