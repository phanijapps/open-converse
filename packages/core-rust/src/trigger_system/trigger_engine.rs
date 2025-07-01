// Trigger Engine
// Core trigger processing engine

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::info;

use crate::errors::Result;
use super::{TriggerCondition, TriggerEvent};

pub struct TriggerEngine {
    conditions: Arc<RwLock<HashMap<uuid::Uuid, TriggerCondition>>>,
    is_running: Arc<RwLock<bool>>,
}

impl TriggerEngine {
    pub fn new() -> Self {
        Self {
            conditions: Arc::new(RwLock::new(HashMap::new())),
            is_running: Arc::new(RwLock::new(false)),
        }
    }

    pub async fn start(&self) -> Result<()> {
        info!("Starting trigger engine");
        *self.is_running.write().await = true;
        Ok(())
    }

    pub async fn stop(&self) -> Result<()> {
        info!("Stopping trigger engine");
        *self.is_running.write().await = false;
        Ok(())
    }

    pub async fn register_condition(&self, condition: TriggerCondition) -> Result<()> {
        self.conditions.write().await.insert(condition.id, condition);
        Ok(())
    }

    pub async fn remove_condition(&self, condition_id: uuid::Uuid) -> Result<()> {
        self.conditions.write().await.remove(&condition_id);
        Ok(())
    }
}

impl Default for TriggerEngine {
    fn default() -> Self {
        Self::new()
    }
}
