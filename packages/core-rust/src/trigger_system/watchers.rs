// Watchers
// File system and other watchers

use crate::errors::Result;

pub struct FileWatcher;

impl FileWatcher {
    pub fn new() -> Self {
        Self
    }

    pub async fn start_watching(&self, _path: &str) -> Result<()> {
        // TODO: Implement file watching
        Ok(())
    }
}

impl Default for FileWatcher {
    fn default() -> Self {
        Self::new()
    }
}
