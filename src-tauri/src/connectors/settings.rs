//! Settings manager for ~/.openconv/settings

use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::io::{self, Write};

pub struct SettingsManager {
    pub path: PathBuf,
}

impl SettingsManager {
    pub fn new() -> Self {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        let path = PathBuf::from(home).join(".openconv").join("settings");
        Self { path }
    }

    pub fn load(&self) -> io::Result<HashMap<String, String>> {
        if !self.path.exists() {
            return Ok(HashMap::new());
        }
        let content = fs::read_to_string(&self.path)?;
        let map: HashMap<String, String> = serde_json::from_str(&content).unwrap_or_default();
        Ok(map)
    }

    pub fn save(&self, settings: &HashMap<String, String>) -> io::Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let content = serde_json::to_string_pretty(settings).unwrap();
        let mut file = fs::File::create(&self.path)?;
        file.write_all(content.as_bytes())?;
        Ok(())
    }
}
