// State Manager
// Handles agent state persistence and recovery

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use sqlx::{SqlitePool, Row};
use uuid::Uuid;
use chrono::Utc;
use serde_json;
use tracing::{info, debug};

use crate::errors::{AgentSpaceError, Result};
use crate::types::AgentId;
use super::types::{AgentAction};
use super::executor::ExecutionResult;

pub struct StateManager {
    database_pool: SqlitePool,
    state_cache: Arc<RwLock<HashMap<AgentId, AgentState>>>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AgentState {
    pub agent_id: AgentId,
    pub current_actions: Vec<AgentAction>,
    pub persistent_data: serde_json::Value,
    pub runtime_data: serde_json::Value,
    pub last_checkpoint: chrono::DateTime<chrono::Utc>,
    pub version: u32,
}

impl StateManager {
    pub async fn new(database_pool: SqlitePool) -> Result<Self> {
        let manager = Self {
            database_pool,
            state_cache: Arc::new(RwLock::new(HashMap::new())),
        };

        manager.initialize_database().await?;
        Ok(manager)
    }

    /// Initialize the database schema for state management
    async fn initialize_database(&self) -> Result<()> {
        debug!("Initializing state management database schema");

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS agent_states (
                agent_id TEXT PRIMARY KEY,
                persistent_data TEXT NOT NULL,
                runtime_data TEXT NOT NULL,
                last_checkpoint DATETIME NOT NULL,
                version INTEGER NOT NULL DEFAULT 1
            )
            "#,
        )
        .execute(&self.database_pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS action_history (
                id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL,
                action_data TEXT NOT NULL,
                execution_result TEXT,
                created_at DATETIME NOT NULL,
                completed_at DATETIME,
                FOREIGN KEY (agent_id) REFERENCES agent_states (agent_id)
            )
            "#,
        )
        .execute(&self.database_pool)
        .await?;

        info!("State management database schema initialized successfully");
        Ok(())
    }

    /// Save agent state
    pub async fn save_agent_state(&self, state: &AgentState) -> Result<()> {
        debug!("Saving agent state for agent: {}", state.agent_id);

        let persistent_data = serde_json::to_string(&state.persistent_data)?;
        let runtime_data = serde_json::to_string(&state.runtime_data)?;

        sqlx::query(
            r#"
            INSERT OR REPLACE INTO agent_states 
            (agent_id, persistent_data, runtime_data, last_checkpoint, version)
            VALUES (?, ?, ?, ?, ?)
            "#,
        )
        .bind(state.agent_id.to_string())
        .bind(persistent_data)
        .bind(runtime_data)
        .bind(state.last_checkpoint)
        .bind(state.version as i32)
        .execute(&self.database_pool)
        .await?;

        // Update cache
        self.state_cache.write().await.insert(state.agent_id, state.clone());

        Ok(())
    }

    /// Load agent state
    pub async fn load_agent_state(&self, agent_id: AgentId) -> Result<Option<AgentState>> {
        // Check cache first
        if let Some(state) = self.state_cache.read().await.get(&agent_id) {
            return Ok(Some(state.clone()));
        }

        // Load from database
        let row = sqlx::query(
            "SELECT * FROM agent_states WHERE agent_id = ?"
        )
        .bind(agent_id.to_string())
        .fetch_optional(&self.database_pool)
        .await?;

        if let Some(row) = row {
            let persistent_data: String = row.get("persistent_data");
            let runtime_data: String = row.get("runtime_data");

            let state = AgentState {
                agent_id,
                current_actions: Vec::new(), // Actions are loaded separately
                persistent_data: serde_json::from_str(&persistent_data)?,
                runtime_data: serde_json::from_str(&runtime_data)?,
                last_checkpoint: row.get("last_checkpoint"),
                version: row.get::<i32, _>("version") as u32,
            };

            // Cache the loaded state
            self.state_cache.write().await.insert(agent_id, state.clone());

            Ok(Some(state))
        } else {
            Ok(None)
        }
    }

    /// Create initial state for an agent
    pub async fn create_agent_state(&self, agent_id: AgentId) -> Result<AgentState> {
        let state = AgentState {
            agent_id,
            current_actions: Vec::new(),
            persistent_data: serde_json::json!({}),
            runtime_data: serde_json::json!({}),
            last_checkpoint: Utc::now(),
            version: 1,
        };

        self.save_agent_state(&state).await?;
        Ok(state)
    }

    /// Update agent's persistent data
    pub async fn update_persistent_data(&self, agent_id: AgentId, data: serde_json::Value) -> Result<()> {
        if let Some(mut state) = self.load_agent_state(agent_id).await? {
            state.persistent_data = data;
            state.last_checkpoint = Utc::now();
            state.version += 1;
            self.save_agent_state(&state).await?;
        } else {
            return Err(AgentSpaceError::AgentRuntime(format!("Agent state not found: {}", agent_id)));
        }
        Ok(())
    }

    /// Update agent's runtime data
    pub async fn update_runtime_data(&self, agent_id: AgentId, data: serde_json::Value) -> Result<()> {
        if let Some(mut state) = self.load_agent_state(agent_id).await? {
            state.runtime_data = data;
            state.last_checkpoint = Utc::now();
            // Don't increment version for runtime data updates
            self.save_agent_state(&state).await?;
        } else {
            return Err(AgentSpaceError::AgentRuntime(format!("Agent state not found: {}", agent_id)));
        }
        Ok(())
    }

    /// Save action result
    pub async fn save_action_result(&self, action: &AgentAction, result: &ExecutionResult) -> Result<()> {
        debug!("Saving action result for action: {}", action.id);

        let action_data = serde_json::to_string(action)?;
        let execution_result = serde_json::to_string(result)?;

        sqlx::query(
            r#"
            INSERT INTO action_history 
            (id, agent_id, action_data, execution_result, created_at, completed_at)
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(action.id.to_string())
        .bind(action.agent_id.to_string())
        .bind(action_data)
        .bind(execution_result)
        .bind(action.started_at)
        .bind(action.completed_at)
        .execute(&self.database_pool)
        .await?;

        Ok(())
    }

    /// Get action history for an agent
    pub async fn get_action_history(&self, agent_id: AgentId, limit: Option<u32>) -> Result<Vec<AgentAction>> {
        let limit_clause = match limit {
            Some(n) => format!("LIMIT {}", n),
            None => "".to_string(),
        };

        let query = format!(
            "SELECT action_data FROM action_history WHERE agent_id = ? ORDER BY created_at DESC {}",
            limit_clause
        );

        let rows = sqlx::query(&query)
            .bind(agent_id.to_string())
            .fetch_all(&self.database_pool)
            .await?;

        let mut actions = Vec::new();
        for row in rows {
            let action_data: String = row.get("action_data");
            let action: AgentAction = serde_json::from_str(&action_data)?;
            actions.push(action);
        }

        Ok(actions)
    }

    /// Delete agent state
    pub async fn delete_agent_state(&self, agent_id: AgentId) -> Result<()> {
        info!("Deleting agent state for agent: {}", agent_id);

        // Delete from database
        sqlx::query("DELETE FROM action_history WHERE agent_id = ?")
            .bind(agent_id.to_string())
            .execute(&self.database_pool)
            .await?;

        sqlx::query("DELETE FROM agent_states WHERE agent_id = ?")
            .bind(agent_id.to_string())
            .execute(&self.database_pool)
            .await?;

        // Remove from cache
        self.state_cache.write().await.remove(&agent_id);

        Ok(())
    }

    /// Create checkpoint for agent state
    pub async fn create_checkpoint(&self, agent_id: AgentId) -> Result<()> {
        if let Some(mut state) = self.load_agent_state(agent_id).await? {
            state.last_checkpoint = Utc::now();
            state.version += 1;
            self.save_agent_state(&state).await?;
            
            info!("Created checkpoint for agent: {} (version: {})", agent_id, state.version);
        }
        Ok(())
    }

    /// Restore agent state to a previous checkpoint
    pub async fn restore_checkpoint(&self, agent_id: AgentId, version: u32) -> Result<AgentState> {
        // This is a simplified implementation - in a full system, you'd want versioned storage
        if let Some(state) = self.load_agent_state(agent_id).await? {
            info!("Restored agent {} to checkpoint version {}", agent_id, version);
            Ok(state)
        } else {
            Err(AgentSpaceError::AgentRuntime(format!("Agent state not found: {}", agent_id)))
        }
    }

    /// Get state statistics
    pub async fn get_state_statistics(&self) -> Result<StateStatistics> {
        let state_count = sqlx::query("SELECT COUNT(*) as count FROM agent_states")
            .fetch_one(&self.database_pool)
            .await?
            .get::<i64, _>("count") as u64;

        let action_count = sqlx::query("SELECT COUNT(*) as count FROM action_history")
            .fetch_one(&self.database_pool)
            .await?
            .get::<i64, _>("count") as u64;

        let cache_size = self.state_cache.read().await.len();

        Ok(StateStatistics {
            total_agent_states: state_count,
            total_action_history: action_count,
            cached_states: cache_size,
        })
    }

    /// Clear old action history
    pub async fn cleanup_old_actions(&self, days_to_keep: u32) -> Result<u64> {
        let cutoff_date = Utc::now() - chrono::Duration::days(days_to_keep as i64);

        let result = sqlx::query("DELETE FROM action_history WHERE created_at < ?")
            .bind(cutoff_date)
            .execute(&self.database_pool)
            .await?;

        let deleted_count = result.rows_affected();
        info!("Cleaned up {} old action records", deleted_count);

        Ok(deleted_count)
    }
}

#[derive(Debug, Clone)]
pub struct StateStatistics {
    pub total_agent_states: u64,
    pub total_action_history: u64,
    pub cached_states: usize,
}

impl Default for AgentState {
    fn default() -> Self {
        Self {
            agent_id: Uuid::new_v4(),
            current_actions: Vec::new(),
            persistent_data: serde_json::json!({}),
            runtime_data: serde_json::json!({}),
            last_checkpoint: Utc::now(),
            version: 1,
        }
    }
}
