// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use std::fs;
use std::path::Path;
use std::sync::Arc;
use tokio::sync::Mutex;

mod database;

use database::commands::DatabaseState;

// Tauri commands for frontend communication
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn get_ai_response(message: String) -> Result<String, String> {
    // TODO: Implement actual AI integration
    // For now, return a mock response
    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
    Ok(format!("AI Response to: {}", message))
}

#[tauri::command]
fn show_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn hide_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn read_settings_file(file_path: String) -> Result<String, String> {
    // Expand the tilde path
    let expanded_path = if file_path.starts_with("~/") {
        if let Ok(home_dir) = std::env::var("HOME") {
            file_path.replace("~/", &format!("{}/", home_dir))
        } else {
            return Err("Unable to determine home directory".to_string());
        }
    } else {
        file_path
    };

    match fs::read_to_string(&expanded_path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to read file {}: {}", expanded_path, e)),
    }
}

#[tauri::command]
async fn write_settings_file(file_path: String, content: String) -> Result<(), String> {
    // Expand the tilde path
    let expanded_path = if file_path.starts_with("~/") {
        if let Ok(home_dir) = std::env::var("HOME") {
            file_path.replace("~/", &format!("{}/", home_dir))
        } else {
            return Err("Unable to determine home directory".to_string());
        }
    } else {
        file_path
    };

    // Create parent directories if they don't exist
    if let Some(parent) = Path::new(&expanded_path).parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            return Err(format!("Failed to create directory {}: {}", parent.display(), e));
        }
    }

    match fs::write(&expanded_path, content) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to write file {}: {}", expanded_path, e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_ai_response,
            show_window,
            hide_window,
            read_settings_file,
            write_settings_file,
            // Database commands
            database::commands::init_database,
            database::commands::get_database_path,
            database::commands::get_database_stats,
            database::commands::clear_all_memory,
            // Persona commands
            database::commands::create_persona,
            database::commands::get_personas,
            database::commands::delete_persona,
            // Conversation commands
            database::commands::create_conversation,
            database::commands::get_conversations,
            database::commands::delete_conversation,
            // Message commands
            database::commands::save_message,
            database::commands::get_recent_messages,
            database::commands::delete_message,
            // Search commands
            database::commands::semantic_search,
        ])
        .setup(|app| {
            // Initialize database state
            let database_state: DatabaseState = Arc::new(Mutex::new(None));
            app.manage(database_state);

            // Create tray menu items
            let show = MenuItem::new(app, "Show", true, None::<&str>)?;
            let hide = MenuItem::new(app, "Hide", true, None::<&str>)?;
            let quit = MenuItem::new(app, "Quit", true, None::<&str>)?;
            
            // Create tray menu
            let tray_menu = Menu::new(app)?;
            tray_menu.append(&show)?;
            tray_menu.append(&hide)?;
            tray_menu.append(&quit)?;

            // Create tray icon
            let _tray = TrayIconBuilder::with_id("main")
                .tooltip("OpenConverse")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
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
                        }
                    }
                })
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "Show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "Hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "Quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            // Handle window events
            if let Some(window) = app.get_webview_window("main") {
                window.on_window_event(|event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        // Hide to system tray instead of closing
                        api.prevent_close();
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}
