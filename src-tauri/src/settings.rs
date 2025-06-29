use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub id: String,
    pub description: Option<String>,
    pub base_url: Option<String>,
    pub api_key: Option<String>,
    pub enabled: Option<bool>,
    pub verified: Option<bool>,
    pub last_verified: Option<String>,
    pub verification_error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SettingsData {
    pub providers: Vec<ProviderConfig>,
    pub memory_config: serde_json::Value,
}

fn settings_path() -> PathBuf {
    let home = dirs::home_dir().expect("Could not get home directory");
    home.join(".openconv/settings/settings.json")
}

#[command]
pub fn save_settings(settings: SettingsData) -> Result<(), String> {
    println!("[Tauri] save_settings called with: {:?}", settings);
    let path = settings_path();
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create settings directory: {}", e))?;
        }
    }
    let json = serde_json::to_string_pretty(&settings).map_err(|e| format!("Failed to serialize settings: {}", e))?;
    let mut file = fs::File::create(&path).map_err(|e| format!("Failed to create settings file: {}", e))?;
    file.write_all(json.as_bytes()).map_err(|e| format!("Failed to write settings: {}", e))?;
    println!("[Tauri] Settings saved successfully to: {:?}", path);
    Ok(())
}

#[command]
pub fn load_settings() -> Result<SettingsData, String> {
    let path = settings_path();
    println!("[Tauri] load_settings called, reading from: {:?}", path);
    
    if !path.exists() {
        println!("[Tauri] Settings file doesn't exist, returning default settings");
        return Ok(SettingsData {
            providers: vec![],
            memory_config: serde_json::json!({
                "provider": "sqlite",
                "config": {}
            }),
        });
    }
    
    let data = fs::read_to_string(&path).map_err(|e| format!("Failed to read settings: {}", e))?;
    let settings: SettingsData = serde_json::from_str(&data).map_err(|e| format!("Failed to parse settings: {}", e))?;
    println!("[Tauri] Settings loaded successfully: {:?}", settings);
    Ok(settings)
}
