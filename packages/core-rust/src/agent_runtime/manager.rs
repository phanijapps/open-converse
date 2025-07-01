// Agent Manager
// Handles agent persistence, lifecycle management, and storage

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use sqlx::{SqlitePool, Row};
use uuid::Uuid;
use chrono::Utc;
use tracing::{info, debug};

use crate::errors::{AgentSpaceError, Result};
use crate::types::AgentId;
use super::types::{Agent, AgentStatus, AgentTemplate, AgentConfig};

pub struct AgentManager {
    database_pool: SqlitePool,
    agents_cache: Arc<RwLock<HashMap<AgentId, Agent>>>,
    storage_path: PathBuf,
}

impl AgentManager {
    pub async fn new(database_path: PathBuf) -> Result<Self> {
        // Create database connection
        let database_url = format!("sqlite://{}", database_path.to_string_lossy());
        let pool = SqlitePool::connect(&database_url).await?;

        // Initialize database schema
        let manager = Self {
            database_pool: pool,
            agents_cache: Arc::new(RwLock::new(HashMap::new())),
            storage_path: database_path.parent().unwrap_or(&database_path).to_path_buf(),
        };

        manager.initialize_database().await?;
        Ok(manager)
    }

    /// Initialize the database schema for agents
    async fn initialize_database(&self) -> Result<()> {
        debug!("Initializing agent database schema");

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                template_type TEXT NOT NULL,
                template_config TEXT NOT NULL,
                agent_config TEXT NOT NULL,
                status TEXT NOT NULL,
                capabilities TEXT NOT NULL,
                metrics TEXT NOT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL
            )
            "#,
        )
        .execute(&self.database_pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS agent_actions (
                id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL,
                action_type TEXT NOT NULL,
                input_data TEXT,
                output_data TEXT,
                status TEXT NOT NULL,
                started_at DATETIME NOT NULL,
                completed_at DATETIME,
                error_message TEXT,
                FOREIGN KEY (agent_id) REFERENCES agents (id)
            )
            "#,
        )
        .execute(&self.database_pool)
        .await?;

        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_agents_status ON agents (status);
            CREATE INDEX IF NOT EXISTS idx_agent_actions_agent_id ON agent_actions (agent_id);
            CREATE INDEX IF NOT EXISTS idx_agent_actions_status ON agent_actions (status);
            "#,
        )
        .execute(&self.database_pool)
        .await?;

        info!("Agent database schema initialized successfully");
        Ok(())
    }

    /// Register a new agent in the system
    pub async fn register_agent(&self, agent: Agent) -> Result<()> {
        info!("Registering agent: {} ({})", agent.name, agent.id);

        // Serialize complex fields
        let template_config = serde_json::to_string(&agent.template)?;
        let agent_config = serde_json::to_string(&agent.config)?;
        let capabilities = serde_json::to_string(&agent.capabilities)?;
        let metrics = serde_json::to_string(&agent.metrics)?;

        // Insert into database
        sqlx::query(
            r#"
            INSERT INTO agents (
                id, name, description, template_type, template_config, 
                agent_config, status, capabilities, metrics, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(agent.id.to_string())
        .bind(&agent.name)
        .bind(&agent.description)
        .bind(self.get_template_type(&agent.template))
        .bind(template_config)
        .bind(agent_config)
        .bind(self.status_to_string(&agent.status))
        .bind(capabilities)
        .bind(metrics)
        .bind(agent.timestamps.created_at)
        .bind(agent.timestamps.updated_at)
        .execute(&self.database_pool)
        .await?;

        // Cache the agent
        self.agents_cache.write().await.insert(agent.id, agent);

        info!("Agent registered successfully");
        Ok(())
    }

    /// Save agent state to persistent storage
    pub async fn save_agent(&self, agent: &Agent) -> Result<()> {
        debug!("Saving agent: {} ({})", agent.name, agent.id);

        let template_config = serde_json::to_string(&agent.template)?;
        let agent_config = serde_json::to_string(&agent.config)?;
        let capabilities = serde_json::to_string(&agent.capabilities)?;
        let metrics = serde_json::to_string(&agent.metrics)?;

        sqlx::query(
            r#"
            UPDATE agents SET 
                name = ?, description = ?, template_config = ?, 
                agent_config = ?, status = ?, capabilities = ?, 
                metrics = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&agent.name)
        .bind(&agent.description)
        .bind(template_config)
        .bind(agent_config)
        .bind(self.status_to_string(&agent.status))
        .bind(capabilities)
        .bind(metrics)
        .bind(Utc::now())
        .bind(agent.id.to_string())
        .execute(&self.database_pool)
        .await?;

        // Update cache
        self.agents_cache.write().await.insert(agent.id, agent.clone());

        Ok(())
    }

    /// Load an agent by ID
    pub async fn load_agent(&self, agent_id: AgentId) -> Result<Option<Agent>> {
        // Check cache first
        if let Some(agent) = self.agents_cache.read().await.get(&agent_id) {
            return Ok(Some(agent.clone()));
        }

        // Load from database
        let row = sqlx::query(
            "SELECT * FROM agents WHERE id = ?"
        )
        .bind(agent_id.to_string())
        .fetch_optional(&self.database_pool)
        .await?;

        if let Some(row) = row {
            let agent = self.row_to_agent(row)?;
            
            // Cache the loaded agent
            self.agents_cache.write().await.insert(agent_id, agent.clone());
            
            Ok(Some(agent))
        } else {
            Ok(None)
        }
    }

    /// Load all agents from storage
    pub async fn load_all_agents(&self) -> Result<Vec<Agent>> {
        debug!("Loading all agents from database");

        let rows = sqlx::query("SELECT * FROM agents ORDER BY created_at DESC")
            .fetch_all(&self.database_pool)
            .await?;

        let mut agents = Vec::new();
        let mut cache = self.agents_cache.write().await;

        for row in rows {
            let agent = self.row_to_agent(row)?;
            cache.insert(agent.id, agent.clone());
            agents.push(agent);
        }

        info!("Loaded {} agents from database", agents.len());
        Ok(agents)
    }

    /// Get agents by status
    pub async fn get_agents_by_status(&self, status: AgentStatus) -> Result<Vec<Agent>> {
        let status_str = self.status_to_string(&status);
        
        let rows = sqlx::query("SELECT * FROM agents WHERE status = ?")
            .bind(status_str)
            .fetch_all(&self.database_pool)
            .await?;

        let mut agents = Vec::new();
        for row in rows {
            agents.push(self.row_to_agent(row)?);
        }

        Ok(agents)
    }

    /// Delete an agent
    pub async fn delete_agent(&self, agent_id: AgentId) -> Result<()> {
        info!("Deleting agent: {}", agent_id);

        // Delete from database
        sqlx::query("DELETE FROM agent_actions WHERE agent_id = ?")
            .bind(agent_id.to_string())
            .execute(&self.database_pool)
            .await?;

        sqlx::query("DELETE FROM agents WHERE id = ?")
            .bind(agent_id.to_string())
            .execute(&self.database_pool)
            .await?;

        // Remove from cache
        self.agents_cache.write().await.remove(&agent_id);

        info!("Agent deleted successfully: {}", agent_id);
        Ok(())
    }

    /// Get agent statistics
    pub async fn get_agent_statistics(&self) -> Result<AgentStatistics> {
        let row = sqlx::query(
            r#"
            SELECT 
                COUNT(*) as total_agents,
                COUNT(CASE WHEN status = 'Running' THEN 1 END) as running_agents,
                COUNT(CASE WHEN status = 'Ready' THEN 1 END) as ready_agents,
                COUNT(CASE WHEN status = 'Paused' THEN 1 END) as paused_agents,
                COUNT(CASE WHEN status LIKE 'Error%' THEN 1 END) as error_agents
            FROM agents
            "#
        )
        .fetch_one(&self.database_pool)
        .await?;

        Ok(AgentStatistics {
            total_agents: row.get::<i64, _>("total_agents") as u64,
            running_agents: row.get::<i64, _>("running_agents") as u64,
            ready_agents: row.get::<i64, _>("ready_agents") as u64,
            paused_agents: row.get::<i64, _>("paused_agents") as u64,
            error_agents: row.get::<i64, _>("error_agents") as u64,
        })
    }

    /// Search agents by name or description
    pub async fn search_agents(&self, query: &str) -> Result<Vec<Agent>> {
        let search_pattern = format!("%{}%", query);
        
        let rows = sqlx::query(
            "SELECT * FROM agents WHERE name LIKE ? OR description LIKE ? ORDER BY name"
        )
        .bind(&search_pattern)
        .bind(&search_pattern)
        .fetch_all(&self.database_pool)
        .await?;

        let mut agents = Vec::new();
        for row in rows {
            agents.push(self.row_to_agent(row)?);
        }

        Ok(agents)
    }

    /// Convert database row to Agent struct
    fn row_to_agent(&self, row: sqlx::sqlite::SqliteRow) -> Result<Agent> {
        let id_str: String = row.get("id");
        let agent_id = Uuid::parse_str(&id_str)
            .map_err(|e| AgentSpaceError::AgentRuntime(format!("Invalid agent ID: {}", e)))?;

        let template_config: String = row.get("template_config");
        let template: AgentTemplate = serde_json::from_str(&template_config)?;

        let agent_config_str: String = row.get("agent_config");
        let agent_config: AgentConfig = serde_json::from_str(&agent_config_str)?;

        let capabilities_str: String = row.get("capabilities");
        let capabilities = serde_json::from_str(&capabilities_str)?;

        let metrics_str: String = row.get("metrics");
        let metrics = serde_json::from_str(&metrics_str)?;

        let status_str: String = row.get("status");
        let status = self.string_to_status(&status_str);

        Ok(Agent {
            id: agent_id,
            name: row.get("name"),
            description: row.get("description"),
            template,
            config: agent_config,
            status,
            capabilities,
            metrics,
            timestamps: crate::types::Timestamp {
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            },
        })
    }

    /// Convert AgentStatus to string for database storage
    fn status_to_string(&self, status: &AgentStatus) -> String {
        match status {
            AgentStatus::Draft => "Draft".to_string(),
            AgentStatus::Ready => "Ready".to_string(),
            AgentStatus::Running => "Running".to_string(),
            AgentStatus::Paused => "Paused".to_string(),
            AgentStatus::Error(msg) => format!("Error: {}", msg),
            AgentStatus::Stopped => "Stopped".to_string(),
        }
    }

    /// Convert string to AgentStatus from database
    fn string_to_status(&self, status_str: &str) -> AgentStatus {
        if status_str.starts_with("Error: ") {
            AgentStatus::Error(status_str[7..].to_string())
        } else {
            match status_str {
                "Draft" => AgentStatus::Draft,
                "Ready" => AgentStatus::Ready,
                "Running" => AgentStatus::Running,
                "Paused" => AgentStatus::Paused,
                "Stopped" => AgentStatus::Stopped,
                _ => AgentStatus::Error(format!("Unknown status: {}", status_str)),
            }
        }
    }

    /// Get template type string for database storage
    fn get_template_type(&self, template: &AgentTemplate) -> String {
        match template {
            AgentTemplate::PersonalAssistant { .. } => "PersonalAssistant".to_string(),
            AgentTemplate::ResearchAssistant { .. } => "ResearchAssistant".to_string(),
            AgentTemplate::ProductivityManager { .. } => "ProductivityManager".to_string(),
            AgentTemplate::DataAnalyst { .. } => "DataAnalyst".to_string(),
            AgentTemplate::FinanceTracker { .. } => "FinanceTracker".to_string(),
            AgentTemplate::HealthMonitor { .. } => "HealthMonitor".to_string(),
            AgentTemplate::ContentCreator { .. } => "ContentCreator".to_string(),
            AgentTemplate::LearningCompanion { .. } => "LearningCompanion".to_string(),
            AgentTemplate::JournalAssistant { .. } => "JournalAssistant".to_string(),
            AgentTemplate::DeveloperCompanion { .. } => "DeveloperCompanion".to_string(),
            AgentTemplate::SystemMonitor { .. } => "SystemMonitor".to_string(),
            AgentTemplate::DataCurator { .. } => "DataCurator".to_string(),
            AgentTemplate::CustomAgent { .. } => "CustomAgent".to_string(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct AgentStatistics {
    pub total_agents: u64,
    pub running_agents: u64,
    pub ready_agents: u64,
    pub paused_agents: u64,
    pub error_agents: u64,
}
