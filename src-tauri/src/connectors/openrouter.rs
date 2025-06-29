//! OpenRouter connector implementation

use super::Connector;
use async_trait::async_trait;
use std::collections::HashMap;
use crate::database::Result;

pub struct OpenRouterConnector;

#[async_trait]
impl Connector for OpenRouterConnector {
    async fn test_settings(&self, settings: &HashMap<String, String>) -> Result<bool> {
        let api_key = settings.get("apiKey").ok_or_else(||
            crate::database::DatabaseError::Connection("Missing OpenRouter API key".to_string())
        )?;
        // Make a real HTTP request to OpenRouter credits endpoint
        let client = reqwest::Client::new();
        let res = client
            .get("https://openrouter.ai/api/v1/credits")
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await
            .map_err(|e| crate::database::DatabaseError::Connection(format!("HTTP error: {}", e)))?;
        Ok(res.status().is_success())
    }
    fn name(&self) -> &'static str {
        "openrouter"
    }
}
