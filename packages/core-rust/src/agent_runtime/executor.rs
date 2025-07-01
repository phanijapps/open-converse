// Agent Executor
// Handles the actual execution of agent actions and workflows

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{RwLock, mpsc, Mutex, Semaphore};
use tokio::time::timeout;
use uuid::Uuid;
use chrono::Utc;
use tracing::{info, warn, error, debug};

use crate::errors::{AgentSpaceError, Result};
use crate::types::AgentId;
use super::types::{AgentConfig, AgentAction, ActionType, ActionStatus};
use super::messaging::{MessageBus, InterAgentMessage};
use super::state_manager::StateManager;

pub struct AgentExecutor {
    agent_id: AgentId,
    config: AgentConfig,
    message_bus: Arc<MessageBus>,
    state_manager: Arc<StateManager>,
    action_queue: Arc<Mutex<mpsc::Receiver<AgentAction>>>,
    action_sender: mpsc::Sender<AgentAction>,
    execution_semaphore: Arc<Semaphore>,
    active_actions: Arc<RwLock<HashMap<Uuid, ExecutionContext>>>,
    is_running: Arc<RwLock<bool>>,
    python_runtime: Option<Arc<crate::python_service::PythonService>>,
}

#[derive(Debug, Clone)]
pub struct ExecutionContext {
    pub action_id: Uuid,
    pub agent_id: AgentId,
    pub started_at: Instant,
    pub timeout_duration: Duration,
    pub retry_count: u32,
    pub max_retries: u32,
    pub environment: HashMap<String, String>,
    pub input_data: serde_json::Value,
    pub current_status: ActionStatus,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ExecutionResult {
    pub action_id: Uuid,
    pub success: bool,
    pub output_data: Option<serde_json::Value>,
    pub error_message: Option<String>,
    pub execution_time: Duration,
    pub memory_used: u64,
    pub resources_accessed: Vec<String>,
}

impl AgentExecutor {
    pub async fn new(
        agent_id: AgentId,
        config: AgentConfig,
        message_bus: Arc<MessageBus>,
        state_manager: Arc<StateManager>,
    ) -> Result<Self> {
        let (action_sender, action_receiver) = mpsc::channel(1000);
        let execution_semaphore = Arc::new(Semaphore::new(config.max_concurrent_actions as usize));

        // Initialize Python runtime if needed
        let python_runtime = if config.python_config.is_some() {
            Some(Arc::new(crate::python_service::PythonService::new().await?))
        } else {
            None
        };

        Ok(Self {
            agent_id,
            config,
            message_bus,
            state_manager,
            action_queue: Arc::new(Mutex::new(action_receiver)),
            action_sender,
            execution_semaphore,
            active_actions: Arc::new(RwLock::new(HashMap::new())),
            is_running: Arc::new(RwLock::new(false)),
            python_runtime,
        })
    }

    /// Start the executor and begin processing actions
    pub async fn start(&self) -> Result<()> {
        info!("Starting agent executor for agent: {}", self.agent_id);
        
        *self.is_running.write().await = true;

        // Start the action processing loop
        self.start_action_loop().await?;

        info!("Agent executor started for agent: {}", self.agent_id);
        Ok(())
    }

    /// Stop the executor and cancel all running actions
    pub async fn stop(&self) -> Result<()> {
        info!("Stopping agent executor for agent: {}", self.agent_id);
        
        *self.is_running.write().await = false;

        // Cancel all active actions
        self.cancel_all_actions().await?;

        info!("Agent executor stopped for agent: {}", self.agent_id);
        Ok(())
    }

    /// Queue an action for execution
    pub async fn execute_action(&self, action: AgentAction) -> Result<()> {
        if !*self.is_running.read().await {
            return Err(AgentSpaceError::AgentRuntime("Executor is not running".to_string()));
        }

        debug!("Queuing action for execution: {:?}", action.action_type);
        
        self.action_sender.send(action).await
            .map_err(|e| AgentSpaceError::AgentRuntime(format!("Failed to queue action: {}", e)))?;

        Ok(())
    }

    /// Get the status of all active actions
    pub async fn get_active_actions(&self) -> Vec<ExecutionContext> {
        self.active_actions.read().await.values().cloned().collect()
    }

    /// Start the action processing loop
    async fn start_action_loop(&self) -> Result<()> {
        let action_queue = self.action_queue.clone();
        let executor_state = ExecutorState {
            agent_id: self.agent_id,
            config: self.config.clone(),
            message_bus: self.message_bus.clone(),
            state_manager: self.state_manager.clone(),
            execution_semaphore: self.execution_semaphore.clone(),
            active_actions: self.active_actions.clone(),
            is_running: self.is_running.clone(),
            python_runtime: self.python_runtime.clone(),
        };

        tokio::spawn(async move {
            let mut queue = action_queue.lock().await;
            
            while let Some(action) = queue.recv().await {
                if !*executor_state.is_running.read().await {
                    break;
                }

                // Process the action
                if let Err(e) = executor_state.process_action(action).await {
                    error!("Error processing action: {}", e);
                }
            }
        });

        Ok(())
    }

    /// Cancel all active actions
    async fn cancel_all_actions(&self) -> Result<()> {
        let active_actions = self.active_actions.read().await;
        let action_ids: Vec<Uuid> = active_actions.keys().cloned().collect();
        drop(active_actions);

        for action_id in action_ids {
            if let Err(e) = self.cancel_action(action_id).await {
                warn!("Failed to cancel action {}: {}", action_id, e);
            }
        }

        Ok(())
    }

    /// Cancel a specific action
    async fn cancel_action(&self, action_id: Uuid) -> Result<()> {
        if let Some(mut context) = self.active_actions.write().await.remove(&action_id) {
            context.current_status = ActionStatus::Cancelled;
            info!("Cancelled action: {}", action_id);
        }
        Ok(())
    }
}

/// Internal state structure for the executor processing loop
#[derive(Clone)]
struct ExecutorState {
    agent_id: AgentId,
    config: AgentConfig,
    message_bus: Arc<MessageBus>,
    state_manager: Arc<StateManager>,
    execution_semaphore: Arc<Semaphore>,
    active_actions: Arc<RwLock<HashMap<Uuid, ExecutionContext>>>,
    is_running: Arc<RwLock<bool>>,
    python_runtime: Option<Arc<crate::python_service::PythonService>>,
}

impl ExecutorState {
    async fn process_action(&self, mut action: AgentAction) -> Result<()> {
        debug!("Processing action {} for agent {}", action.id, self.agent_id);

        // Acquire execution permit
        let _permit = self.execution_semaphore.acquire().await
            .map_err(|e| AgentSpaceError::AgentRuntime(format!("Failed to acquire execution permit: {}", e)))?;

        // Create execution context
        let context = ExecutionContext {
            action_id: action.id,
            agent_id: self.agent_id,
            started_at: Instant::now(),
            timeout_duration: Duration::from_secs(self.config.timeout_seconds),
            retry_count: 0,
            max_retries: self.config.retry_attempts,
            environment: self.config.environment_variables.clone(),
            input_data: action.input_data.clone(),
            current_status: ActionStatus::Running,
        };

        // Register the action as active
        self.active_actions.write().await.insert(action.id, context.clone());

        // Update action status
        action.status = ActionStatus::Running;
        action.started_at = Utc::now();

        // Execute the action with timeout
        let execution_result = match timeout(
            context.timeout_duration,
            self.execute_action_internal(action.clone(), context.clone())
        ).await {
            Ok(result) => result,
            Err(_) => {
                error!("Action timed out: {}", action.id);
                ExecutionResult {
                    action_id: action.id,
                    success: false,
                    output_data: None,
                    error_message: Some("Action timed out".to_string()),
                    execution_time: context.timeout_duration,
                    memory_used: 0,
                    resources_accessed: Vec::new(),
                }
            }
        };

        // Update action with results
        action.completed_at = Some(Utc::now());
        if execution_result.success {
            action.status = ActionStatus::Completed;
            action.output_data = execution_result.output_data.clone();
        } else {
            let error_msg = execution_result.error_message.clone()
                .unwrap_or_else(|| "Unknown error".to_string());
            action.status = ActionStatus::Failed(error_msg.clone());
            action.error_message = Some(error_msg);
        }

        // Remove from active actions
        self.active_actions.write().await.remove(&action.id);

        // Save action state
        self.state_manager.save_action_result(&action, &execution_result).await?;

        // Send completion message
        let completion_message = InterAgentMessage {
            id: Uuid::new_v4(),
            from_agent: self.agent_id,
            to_agent: None, // Broadcast
            message_type: crate::agent_runtime::messaging::MessageType::ActionCompleted,
            payload: serde_json::to_value(&execution_result)?,
            timestamp: Utc::now(),
        };
        
        self.message_bus.send_message(completion_message).await?;

        if execution_result.success {
            info!("Action completed successfully: {}", action.id);
        } else {
            warn!("Action failed: {}", action.id);
        }

        Ok(())
    }

    async fn execute_action_internal(
        &self, 
        action: AgentAction, 
        context: ExecutionContext
    ) -> ExecutionResult {
        let start_time = Instant::now();
        
        let result = match action.action_type {
            ActionType::ReadData(source) => {
                self.execute_read_data(source, &context).await
            }
            ActionType::WriteData(destination) => {
                self.execute_write_data(destination, &context).await
            }
            ActionType::ProcessData(processor) => {
                self.execute_process_data(processor, &context).await
            }
            ActionType::SendMessage(target) => {
                self.execute_send_message(target, &context).await
            }
            ActionType::SendEmail(config) => {
                self.execute_send_email(config, &context).await
            }
            ActionType::PostWebhook(url) => {
                self.execute_post_webhook(url, &context).await
            }
            ActionType::GenerateText(prompt) => {
                self.execute_generate_text(prompt, &context).await
            }
            ActionType::AnalyzeText(text) => {
                self.execute_analyze_text(text, &context).await
            }
            ActionType::RunLangChain(chain_config) => {
                self.execute_langchain(chain_config, &context).await
            }
            ActionType::RunLangGraph(graph_config) => {
                self.execute_langgraph(graph_config, &context).await
            }
            ActionType::ExecuteCommand(command) => {
                self.execute_command(command, &context).await
            }
            ActionType::WatchFile(path) => {
                self.execute_watch_file(path, &context).await
            }
            ActionType::ScheduleTask(schedule) => {
                self.execute_schedule_task(schedule, &context).await
            }
            ActionType::Custom(action_name, params) => {
                self.execute_custom_action(action_name, params, &context).await
            }
        };

        let execution_time = start_time.elapsed();

        match result {
            Ok(output) => ExecutionResult {
                action_id: action.id,
                success: true,
                output_data: Some(output),
                error_message: None,
                execution_time,
                memory_used: 0, // TODO: Implement memory tracking
                resources_accessed: Vec::new(), // TODO: Implement resource tracking
            },
            Err(error) => ExecutionResult {
                action_id: action.id,
                success: false,
                output_data: None,
                error_message: Some(error.to_string()),
                execution_time,
                memory_used: 0,
                resources_accessed: Vec::new(),
            }
        }
    }

    // Action execution methods
    async fn execute_read_data(&self, source: String, _context: &ExecutionContext) -> Result<serde_json::Value> {
        debug!("Executing read data from source: {}", source);
        // TODO: Implement data reading logic
        Ok(serde_json::json!({"status": "data_read", "source": source}))
    }

    async fn execute_write_data(&self, destination: String, context: &ExecutionContext) -> Result<serde_json::Value> {
        debug!("Executing write data to destination: {}", destination);
        // TODO: Implement data writing logic
        Ok(serde_json::json!({
            "status": "data_written", 
            "destination": destination,
            "data": context.input_data
        }))
    }

    async fn execute_process_data(&self, processor: String, context: &ExecutionContext) -> Result<serde_json::Value> {
        debug!("Executing data processing with processor: {}", processor);
        // TODO: Implement data processing logic
        Ok(serde_json::json!({
            "status": "data_processed", 
            "processor": processor,
            "result": context.input_data
        }))
    }

    async fn execute_send_message(&self, target: String, context: &ExecutionContext) -> Result<serde_json::Value> {
        debug!("Executing send message to target: {}", target);
        // TODO: Implement message sending logic
        Ok(serde_json::json!({
            "status": "message_sent", 
            "target": target,
            "message": context.input_data
        }))
    }

    async fn execute_send_email(&self, config: String, context: &ExecutionContext) -> Result<serde_json::Value> {
        debug!("Executing send email with config: {}", config);
        // TODO: Implement email sending logic
        Ok(serde_json::json!({
            "status": "email_sent", 
            "config": config,
            "content": context.input_data
        }))
    }

    async fn execute_post_webhook(&self, url: String, context: &ExecutionContext) -> Result<serde_json::Value> {
        debug!("Executing webhook post to URL: {}", url);
        // TODO: Implement webhook posting logic
        Ok(serde_json::json!({
            "status": "webhook_posted", 
            "url": url,
            "payload": context.input_data
        }))
    }

    async fn execute_generate_text(&self, prompt: String, _context: &ExecutionContext) -> Result<serde_json::Value> {
        debug!("Executing text generation with prompt: {}", prompt);
        
        if let Some(python_runtime) = &self.python_runtime {
            // Use Python service for text generation
            let result = python_runtime.generate_text(&prompt).await?;
            Ok(serde_json::json!({"generated_text": result}))
        } else {
            // Fallback to simple response
            Ok(serde_json::json!({
                "generated_text": format!("Generated response for: {}", prompt)
            }))
        }
    }

    async fn execute_analyze_text(&self, text: String, _context: &ExecutionContext) -> Result<serde_json::Value> {
        debug!("Executing text analysis for text length: {}", text.len());
        
        if let Some(python_runtime) = &self.python_runtime {
            // Use Python service for text analysis
            let result = python_runtime.analyze_text(&text).await?;
            Ok(result)
        } else {
            // Fallback to simple analysis
            Ok(serde_json::json!({
                "analysis": {
                    "character_count": text.len(),
                    "word_count": text.split_whitespace().count(),
                    "sentiment": "neutral"
                }
            }))
        }
    }

    async fn execute_langchain(&self, chain_config: String, context: &ExecutionContext) -> Result<serde_json::Value> {
        debug!("Executing LangChain with config: {}", chain_config);
        
        if let Some(python_runtime) = &self.python_runtime {
            let result = python_runtime.run_langchain(&chain_config, &context.input_data).await?;
            Ok(result)
        } else {
            Err(AgentSpaceError::AgentRuntime("Python runtime not available for LangChain execution".to_string()))
        }
    }

    async fn execute_langgraph(&self, graph_config: String, context: &ExecutionContext) -> Result<serde_json::Value> {
        debug!("Executing LangGraph with config: {}", graph_config);
        
        if let Some(python_runtime) = &self.python_runtime {
            let result = python_runtime.run_langgraph(&graph_config, &context.input_data).await?;
            Ok(result)
        } else {
            Err(AgentSpaceError::AgentRuntime("Python runtime not available for LangGraph execution".to_string()))
        }
    }

    async fn execute_command(&self, command: String, _context: &ExecutionContext) -> Result<serde_json::Value> {
        debug!("Executing command: {}", command);
        // TODO: Implement command execution logic with security checks
        Ok(serde_json::json!({
            "status": "command_executed", 
            "command": command,
            "output": "Command execution not yet implemented"
        }))
    }

    async fn execute_watch_file(&self, path: String, _context: &ExecutionContext) -> Result<serde_json::Value> {
        debug!("Executing file watch for path: {}", path);
        // TODO: Implement file watching logic
        Ok(serde_json::json!({
            "status": "file_watch_started", 
            "path": path
        }))
    }

    async fn execute_schedule_task(&self, schedule: String, context: &ExecutionContext) -> Result<serde_json::Value> {
        debug!("Executing task scheduling with schedule: {}", schedule);
        // TODO: Implement task scheduling logic
        Ok(serde_json::json!({
            "status": "task_scheduled", 
            "schedule": schedule,
            "task": context.input_data
        }))
    }

    async fn execute_custom_action(&self, action_name: String, params: serde_json::Value, _context: &ExecutionContext) -> Result<serde_json::Value> {
        debug!("Executing custom action: {}", action_name);
        // TODO: Implement custom action registry and execution
        Ok(serde_json::json!({
            "status": "custom_action_executed", 
            "action": action_name,
            "params": params
        }))
    }
}
