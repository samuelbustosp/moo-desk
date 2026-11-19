use std::fs;
use std::path::PathBuf;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, WindowEvent,
};

fn resolve_db_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo obtener app_data_dir: {e}"))?;
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("No se pudo crear directorio de datos: {e}"))?;
    }
    Ok(dir.join("moo-db.json"))
}

#[tauri::command]
fn db_get_path(app: AppHandle) -> Result<String, String> {
    let path = resolve_db_file(&app)?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
fn db_read(app: AppHandle) -> Result<Option<String>, String> {
    let path = resolve_db_file(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let content =
        fs::read_to_string(&path).map_err(|e| format!("Error leyendo moo-db.json: {e}"))?;
    Ok(Some(content))
}

#[tauri::command]
fn db_write(app: AppHandle, payload: String) -> Result<(), String> {
    let path = resolve_db_file(&app)?;
    fs::write(&path, payload).map_err(|e| format!("Error escribiendo moo-db.json: {e}"))?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![db_get_path, db_read, db_write])
        .setup(|app| {
            // Posicionar la ventana en el borde superior central del monitor (estilo Mac Notch en Windows)
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.current_monitor() {
                    let screen_size = monitor.size();
                    let monitor_pos = monitor.position();
                    if let Ok(win_size) = window.outer_size() {
                        let x = monitor_pos.x
                            + ((screen_size.width as i32 - win_size.width as i32) / 2);
                        let y = monitor_pos.y;
                        let _ = window.set_position(PhysicalPosition::new(x, y));
                    }
                }
            }

            let compact_item =
                MenuItem::with_id(app, "notch", "Modo Notch Superior", true, None::<&str>)?;
            let expanded_item = MenuItem::with_id(
                app,
                "expanded",
                "Desplegar aplicación",
                true,
                None::<&str>,
            )?;
            let settings_item =
                MenuItem::with_id(app, "settings", "Ajustes", true, None::<&str>)?;
            let hide_item = MenuItem::with_id(
                app,
                "hide",
                "Ocultar completamente",
                true,
                None::<&str>,
            )?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit_item =
                MenuItem::with_id(app, "quit", "Salir de Moo", true, None::<&str>)?;

            let tray_menu = Menu::with_items(
                app,
                &[
                    &compact_item,
                    &expanded_item,
                    &settings_item,
                    &hide_item,
                    &separator,
                    &quit_item,
                ],
            )?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&tray_menu)
                .tooltip("Moo")
                .on_menu_event(|app, event| {
                    if let Some(window) = app.get_webview_window("main") {
                        match event.id.as_ref() {
                            "notch" => {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = window.emit("moo://window-action", "notch");
                            }
                            "expanded" => {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = window.emit("moo://window-action", "expanded");
                            }
                            "settings" => {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = window.emit("moo://window-action", "settings");
                            }
                            "hide" => {
                                let _ = window.hide();
                                let _ = window.emit("moo://window-action", "toggle");
                            }
                            "quit" => {
                                app.exit(0);
                            }
                            _ => {}
                        }
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.emit("moo://window-action", "expanded");
                        }
                    }
                });

            if let Some(default_icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(default_icon.clone());
            }

            let _tray = tray_builder.build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("Error al ejecutar Moo en Tauri 2");
}
