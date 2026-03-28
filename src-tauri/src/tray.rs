use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Runtime,
};

use crate::show_and_focus;

pub fn create_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let show_i = MenuItem::with_id(app, "show", "열기", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

    // macOS: 좌클릭 시 메뉴 표시 (OS 관례)
    // Windows: 좌클릭 시 창 토글, 우클릭 시 메뉴
    let menu_on_left = cfg!(target_os = "macos");

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("Redmine UI")
        .menu(&menu)
        .show_menu_on_left_click(menu_on_left)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => app.exit(0),
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    show_and_focus(&window);
                }
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            // macOS: 좌클릭 시 메뉴만 표시, 창 토글하지 않음 (show_menu_on_left_click과 중복 방지)
            if cfg!(target_os = "macos") {
                return;
            }

            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        show_and_focus(&window);
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}
