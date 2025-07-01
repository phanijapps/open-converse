// Connector Registry
// Registry for managing data connectors

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::errors::Result;
use super::{DataConnector, ConnectorInfo};

pub struct ConnectorRegistry {
    connectors: Arc<RwLock<HashMap<String, Box<dyn DataConnector>>>>,
}

impl ConnectorRegistry {
    pub fn new() -> Self {
        Self {
            connectors: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn register_connector(&self, connector: Box<dyn DataConnector>) -> Result<()> {
        let info = connector.get_connector_info();
        self.connectors.write().await.insert(info.id.clone(), connector);
        Ok(())
    }

    pub async fn get_connector(&self, _connector_id: &str) -> Option<Box<dyn DataConnector>> {
        // Note: This is a simplified implementation
        // In practice, you'd need to handle the trait object cloning differently
        None
    }

    pub async fn list_connectors(&self) -> Vec<ConnectorInfo> {
        let connectors = self.connectors.read().await;
        connectors.values().map(|c| c.get_connector_info()).collect()
    }
}

impl Default for ConnectorRegistry {
    fn default() -> Self {
        Self::new()
    }
}
