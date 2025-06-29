//! Connector framework for external services (OpenRouter, etc.)

pub mod openrouter;
pub mod settings;

pub use openrouter::OpenRouterConnector;
pub use settings::SettingsManager;

use async_trait::async_trait;
use std::collections::HashMap;
use crate::database::Result;

#[async_trait]
pub trait Connector: Send + Sync {
    /// Test the connector with given settings (e.g., API key)
    async fn test_settings(&self, settings: &HashMap<String, String>) -> Result<bool>;
    /// Name of the connector
    fn name(&self) -> &'static str;
}
