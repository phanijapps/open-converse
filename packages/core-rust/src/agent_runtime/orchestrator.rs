// Agent Orchestrator
// Central coordination and management of all agents in the system

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{RwLock, mpsc, Mutex};
use chrono::Utc;
use tracing::{info, error, debug};

use crate::errors::{AgentSpaceError, Result};
use crate::types::AgentId;
use super::types::{Agent, AgentStatus, AgentAction};
use super::executor::AgentExecutor;
use super::manager::AgentManager;
use super::scheduler::{AgentScheduler, ScheduleRule};
use super::messaging::MessageBus;
use super::state_manager::StateManager;

pub struct AgentOrchestrator {
    agents: Arc<RwLock<HashMap<AgentId, Agent>>>,
    executors: Arc<RwLock<HashMap<AgentId, AgentExecutor>>>,
    manager: Arc<AgentManager>,
    scheduler: Arc<AgentScheduler>,
    message_bus: Arc<MessageBus>,
    state_manager: Arc<StateManager>,
    control_tx: mpsc::Sender<OrchestratorCommand>,
    control_rx: Arc<Mutex<mpsc::Receiver<OrchestratorCommand>>>,
    is_running: Arc<RwLock<bool>>,
}

#[derive(Debug, Clone)]
pub enum OrchestratorCommand {
    StartAgent(AgentId),
    StopAgent(AgentId),
    PauseAgent(AgentId),
    ResumeAgent(AgentId),
    RestartAgent(AgentId),
    ExecuteAction(AgentId, AgentAction),
    UpdateAgent(Agent),
    RemoveAgent(AgentId),
    Shutdown,
    GetStatus,
}

#[derive(Debug, Clone)]
pub struct OrchestratorStatus {
    pub total_agents: usize,
    pub running_agents: usize,
    pub paused_agents: usize,
    pub error_agents: usize,
    pub total_actions_processed: u64,
    pub uptime_seconds: u64,
}

impl AgentOrchestrator {
    pub async fn new(
        manager: Arc<AgentManager>,
        scheduler: Arc<AgentScheduler>,
        message_bus: Arc<MessageBus>,
        state_manager: Arc<StateManager>,
    ) -> Result<Self> {
        let (control_tx, control_rx) = mpsc::channel(1000);

        Ok(Self {
            agents: Arc::new(RwLock::new(HashMap::new())),
            executors: Arc::new(RwLock::new(HashMap::new())),
            manager,
            scheduler,
            message_bus,
            state_manager,
            control_tx,
            control_rx: Arc::new(Mutex::new(control_rx)),
            is_running: Arc::new(RwLock::new(false)),
        })
    }

    /// Start the orchestrator and begin managing agents
    pub async fn start(&self) -> Result<()> {
        info!("Starting Agent Orchestrator");
        
        // Set running state
        *self.is_running.write().await = true;

        // Load existing agents from storage
        self.load_agents().await?;

        // Start the scheduler
        self.scheduler.start().await?;

        // Start the message bus
        self.message_bus.start().await?;

        // Start the control loop
        self.run_control_loop().await?;

        info!("Agent Orchestrator started successfully");
        Ok(())
    }

    /// Stop the orchestrator and all agents
    pub async fn stop(&self) -> Result<()> {
        info!("Stopping Agent Orchestrator");

        // Set running state to false
        *self.is_running.write().await = false;

        // Stop all agents
        let agent_ids: Vec<AgentId> = self.agents.read().await.keys().cloned().collect();
        for agent_id in agent_ids {
            self.stop_agent_internal(agent_id).await?;
        }

        // Stop subsystems
        self.scheduler.stop().await?;
        self.message_bus.stop().await?;

        // Save agent states
        self.save_agents().await?;

        info!("Agent Orchestrator stopped successfully");
        Ok(())
    }

    /// Register a new agent with the orchestrator
    pub async fn register_agent(&self, mut agent: Agent) -> Result<AgentId> {
        info!("Registering new agent: {} ({})", agent.name, agent.id);

        // Validate agent configuration
        self.validate_agent(&agent)?;

        // Set agent status to Ready
        agent.status = AgentStatus::Ready;

        // Create executor for the agent
        let executor = AgentExecutor::new(
            agent.id,
            agent.config.clone(),
            self.message_bus.clone(),
            self.state_manager.clone(),
        ).await?;

        // Store agent and executor
        self.agents.write().await.insert(agent.id, agent.clone());
        self.executors.write().await.insert(agent.id, executor);

        // Register with manager
        self.manager.register_agent(agent.clone()).await?;

        // Setup scheduling if needed
        if let Some(schedule_rules) = self.extract_schedule_rules(&agent) {
            for rule in schedule_rules {
                self.scheduler.add_rule(agent.id, rule).await?;
            }
        }

        info!("Agent registered successfully: {}", agent.id);
        Ok(agent.id)
    }

    /// Start a specific agent
    pub async fn start_agent(&self, agent_id: AgentId) -> Result<()> {
        self.control_tx.send(OrchestratorCommand::StartAgent(agent_id)).await
            .map_err(|e| AgentSpaceError::AgentRuntime(format!("Failed to send start command: {}", e)))?;
        Ok(())
    }

    /// Stop a specific agent
    pub async fn stop_agent(&self, agent_id: AgentId) -> Result<()> {
        self.control_tx.send(OrchestratorCommand::StopAgent(agent_id)).await
            .map_err(|e| AgentSpaceError::AgentRuntime(format!("Failed to send stop command: {}", e)))?;
        Ok(())
    }

    /// Execute an action on a specific agent
    pub async fn execute_action(&self, agent_id: AgentId, action: AgentAction) -> Result<()> {
        self.control_tx.send(OrchestratorCommand::ExecuteAction(agent_id, action)).await
            .map_err(|e| AgentSpaceError::AgentRuntime(format!("Failed to send execute command: {}", e)))?;
        Ok(())
    }

    /// Get orchestrator status
    pub async fn get_status(&self) -> Result<OrchestratorStatus> {
        let agents = self.agents.read().await;
        let mut running_count = 0;
        let mut paused_count = 0;
        let mut error_count = 0;

        for agent in agents.values() {
            match agent.status {
                AgentStatus::Running => running_count += 1,
                AgentStatus::Paused => paused_count += 1,
                AgentStatus::Error(_) => error_count += 1,
                _ => {}
            }
        }

        Ok(OrchestratorStatus {
            total_agents: agents.len(),
            running_agents: running_count,
            paused_agents: paused_count,
            error_agents: error_count,
            total_actions_processed: 0, // TODO: Implement action counting
            uptime_seconds: 0, // TODO: Implement uptime tracking
        })
    }

    /// Internal method to run the control loop
    async fn run_control_loop(&self) -> Result<()> {
        let control_rx = self.control_rx.clone();
        let orchestrator_state = OrchestratorState {
            agents: self.agents.clone(),
            executors: self.executors.clone(),
            manager: self.manager.clone(),
            scheduler: self.scheduler.clone(),
            message_bus: self.message_bus.clone(),
            state_manager: self.state_manager.clone(),
            is_running: self.is_running.clone(),
        };

        tokio::spawn(async move {
            let mut rx = control_rx.lock().await;
            
            while let Some(command) = rx.recv().await {
                if let Err(e) = orchestrator_state.handle_command(command).await {
                    error!("Error handling orchestrator command: {}", e);
                }
            }
        });

        Ok(())
    }

    /// Load agents from persistent storage
    async fn load_agents(&self) -> Result<()> {
        debug!("Loading agents from storage");
        
        let stored_agents = self.manager.load_all_agents().await?;
        let mut agents = self.agents.write().await;
        let mut executors = self.executors.write().await;

        for agent in stored_agents {
            // Create executor for each agent
            let executor = AgentExecutor::new(
                agent.id,
                agent.config.clone(),
                self.message_bus.clone(),
                self.state_manager.clone(),
            ).await?;

            agents.insert(agent.id, agent.clone());
            executors.insert(agent.id, executor);
        }

        info!("Loaded {} agents from storage", agents.len());
        Ok(())
    }

    /// Save agents to persistent storage
    async fn save_agents(&self) -> Result<()> {
        debug!("Saving agents to storage");
        
        let agents = self.agents.read().await;
        for agent in agents.values() {
            self.manager.save_agent(agent).await?;
        }

        info!("Saved {} agents to storage", agents.len());
        Ok(())
    }

    /// Validate agent configuration
    fn validate_agent(&self, agent: &Agent) -> Result<()> {
        if agent.name.is_empty() {
            return Err(AgentSpaceError::AgentRuntime("Agent name cannot be empty".to_string()));
        }

        if agent.config.timeout_seconds == 0 {
            return Err(AgentSpaceError::AgentRuntime("Agent timeout must be greater than 0".to_string()));
        }

        if agent.config.max_concurrent_actions == 0 {
            return Err(AgentSpaceError::AgentRuntime("Max concurrent actions must be greater than 0".to_string()));
        }

        Ok(())
    }

    /// Extract schedule rules from agent configuration
    fn extract_schedule_rules(&self, _agent: &Agent) -> Option<Vec<ScheduleRule>> {
        // TODO: Implement schedule rule extraction from agent config
        None
    }

    /// Internal method to start an agent
    async fn start_agent_internal(&self, agent_id: AgentId) -> Result<()> {
        info!("Starting agent: {}", agent_id);

        // Update agent status
        if let Some(agent) = self.agents.write().await.get_mut(&agent_id) {
            agent.status = AgentStatus::Running;
            agent.timestamps.updated_at = Utc::now();
        }

        // Start the executor
        if let Some(executor) = self.executors.read().await.get(&agent_id) {
            executor.start().await?;
        }

        info!("Agent started successfully: {}", agent_id);
        Ok(())
    }

    /// Internal method to stop an agent
    async fn stop_agent_internal(&self, agent_id: AgentId) -> Result<()> {
        info!("Stopping agent: {}", agent_id);

        // Update agent status
        if let Some(agent) = self.agents.write().await.get_mut(&agent_id) {
            agent.status = AgentStatus::Stopped;
            agent.timestamps.updated_at = Utc::now();
        }

        // Stop the executor
        if let Some(executor) = self.executors.read().await.get(&agent_id) {
            executor.stop().await?;
        }

        info!("Agent stopped successfully: {}", agent_id);
        Ok(())
    }
}

/// Internal state structure for the orchestrator control loop
#[derive(Clone)]
struct OrchestratorState {
    agents: Arc<RwLock<HashMap<AgentId, Agent>>>,
    executors: Arc<RwLock<HashMap<AgentId, AgentExecutor>>>,
    manager: Arc<AgentManager>,
    scheduler: Arc<AgentScheduler>,
    message_bus: Arc<MessageBus>,
    state_manager: Arc<StateManager>,
    is_running: Arc<RwLock<bool>>,
}

impl OrchestratorState {
    async fn handle_command(&self, command: OrchestratorCommand) -> Result<()> {
        match command {
            OrchestratorCommand::StartAgent(agent_id) => {
                self.start_agent(agent_id).await
            }
            OrchestratorCommand::StopAgent(agent_id) => {
                self.stop_agent(agent_id).await
            }
            OrchestratorCommand::PauseAgent(agent_id) => {
                self.pause_agent(agent_id).await
            }
            OrchestratorCommand::ResumeAgent(agent_id) => {
                self.resume_agent(agent_id).await
            }
            OrchestratorCommand::RestartAgent(agent_id) => {
                self.restart_agent(agent_id).await
            }
            OrchestratorCommand::ExecuteAction(agent_id, action) => {
                self.execute_action(agent_id, action).await
            }
            OrchestratorCommand::UpdateAgent(agent) => {
                self.update_agent(agent).await
            }
            OrchestratorCommand::RemoveAgent(agent_id) => {
                self.remove_agent(agent_id).await
            }
            OrchestratorCommand::Shutdown => {
                self.shutdown().await
            }
            OrchestratorCommand::GetStatus => {
                // Status is handled synchronously
                Ok(())
            }
        }
    }

    async fn start_agent(&self, _agent_id: AgentId) -> Result<()> {
        // Implementation similar to start_agent_internal above
        // ... (implementation details)
        Ok(())
    }

    async fn stop_agent(&self, _agent_id: AgentId) -> Result<()> {
        // Implementation similar to stop_agent_internal above
        // ... (implementation details)
        Ok(())
    }

    async fn pause_agent(&self, _agent_id: AgentId) -> Result<()> {
        // TODO: Implement pause functionality
        Ok(())
    }

    async fn resume_agent(&self, _agent_id: AgentId) -> Result<()> {
        // TODO: Implement resume functionality
        Ok(())
    }

    async fn restart_agent(&self, agent_id: AgentId) -> Result<()> {
        self.stop_agent(agent_id).await?;
        self.start_agent(agent_id).await?;
        Ok(())
    }

    async fn execute_action(&self, agent_id: AgentId, action: AgentAction) -> Result<()> {
        if let Some(executor) = self.executors.read().await.get(&agent_id) {
            executor.execute_action(action).await?;
        }
        Ok(())
    }

    async fn update_agent(&self, agent: Agent) -> Result<()> {
        self.agents.write().await.insert(agent.id, agent);
        Ok(())
    }

    async fn remove_agent(&self, agent_id: AgentId) -> Result<()> {
        self.stop_agent(agent_id).await?;
        self.agents.write().await.remove(&agent_id);
        self.executors.write().await.remove(&agent_id);
        Ok(())
    }

    async fn shutdown(&self) -> Result<()> {
        *self.is_running.write().await = false;
        Ok(())
    }
}
