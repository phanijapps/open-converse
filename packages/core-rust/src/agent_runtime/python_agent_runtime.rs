// Python Agent Runtime
// Process-based container for Python agents with IPC communication

use std::collections::HashMap;
use std::sync::Arc;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::sync::{RwLock, mpsc, Mutex};
use tokio::process::{Child, Command};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde_json::Value;
use tracing::{info, warn, debug, error};

use crate::errors::{AgentSpaceError, Result};
use crate::types::AgentId;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AgentConfig {
    pub name: String,
    pub description: String,
    pub script_path: PathBuf,
    pub environment_variables: HashMap<String, String>,
    pub requirements: Vec<String>, // Python packages
    pub triggers: Vec<TriggerConfig>,
    pub data_connectors: Vec<String>,
    pub memory_limit_mb: u64,
    pub timeout_seconds: u64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TriggerConfig {
    pub trigger_type: TriggerType,
    pub config: Value,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum TriggerType {
    Schedule(String), // Cron expression
    FileChange(PathBuf),
    DataChange(String), // Data source ID
    WebhookReceived(String), // Webhook endpoint
    MessageReceived(String), // Message channel
    Custom(String), // Custom trigger type
}

/// IPC message structure for communication with Python processes
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct IPCMessage {
    pub id: String,
    pub message_type: IPCMessageType,
    pub payload: Value,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum IPCMessageType {
    // From Rust to Python
    Execute { method: String, params: Value },
    Trigger { trigger_type: String, data: Value },
    Stop,
    Status,
    
    // From Python to Rust  
    Response { request_id: String, result: Value },
    Event { event_type: String, data: Value },
    Error { message: String, traceback: Option<String> },
    Heartbeat,
}

#[derive(Debug, Clone)]
pub struct AgentEvent {
    pub event_id: Uuid,
    pub agent_id: AgentId,
    pub event_type: EventType,
    pub payload: Value,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub enum EventType {
    TriggerFired,
    ActionCompleted,
    ActionFailed,
    DataReceived,
    MessageSent,
    StatusChanged,
    Error,
}

/// Process-based agent container that runs Python agents in separate processes
pub struct PythonAgentRuntime {
    agent_id: AgentId,
    agent_config: AgentConfig,
    process: Arc<Mutex<Option<Child>>>,
    stdin_writer: Arc<Mutex<Option<tokio::process::ChildStdin>>>,
    event_sender: mpsc::Sender<AgentEvent>,
    response_receiver: Arc<Mutex<Option<mpsc::Receiver<IPCMessage>>>>,
    is_running: Arc<RwLock<bool>>,
    python_executable: PathBuf,
    agent_wrapper_path: PathBuf,
}

impl PythonAgentRuntime {
    pub async fn new(
        agent_id: AgentId,
        config: AgentConfig,
        python_executable: PathBuf,
        agent_wrapper_path: PathBuf,
    ) -> Result<Self> {
        let (event_sender, _event_receiver) = mpsc::channel(1000);

        // Validate Python script exists
        if !config.script_path.exists() {
            return Err(AgentSpaceError::AgentRuntime(
                format!("Agent script not found: {}", config.script_path.display())
            ));
        }

        // Validate Python executable exists
        if !python_executable.exists() {
            return Err(AgentSpaceError::AgentRuntime(
                format!("Python executable not found: {}", python_executable.display())
            ));
        }

        // Validate agent wrapper exists
        if !agent_wrapper_path.exists() {
            return Err(AgentSpaceError::AgentRuntime(
                format!("Agent wrapper not found: {}", agent_wrapper_path.display())
            ));
        }

        Ok(Self {
            agent_id,
            agent_config: config,
            process: Arc::new(Mutex::new(None)),
            stdin_writer: Arc::new(Mutex::new(None)),
            event_sender,
            response_receiver: Arc::new(Mutex::new(None)),
            is_running: Arc::new(RwLock::new(false)),
            python_executable,
            agent_wrapper_path,
        })
    }

    /// Start the Python agent process
    pub async fn start(&self) -> Result<()> {
        info!("Starting Python agent process: {}", self.agent_id);

        // Set up environment variables
        let mut env_vars = HashMap::new();
        env_vars.insert("AGENT_ID".to_string(), self.agent_id.to_string());
        env_vars.insert("AGENT_SCRIPT_PATH".to_string(), self.agent_config.script_path.display().to_string());
        
        // Add custom environment variables
        for (key, value) in &self.agent_config.environment_variables {
            env_vars.insert(key.clone(), value.clone());
        }

        // Spawn the Python process
        let mut command = Command::new(&self.python_executable);
        command
            .arg(&self.agent_wrapper_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .envs(&env_vars);

        let mut child = command.spawn()
            .map_err(|e| AgentSpaceError::AgentRuntime(
                format!("Failed to spawn Python process: {}", e)
            ))?;

        // Set up communication channels
        let stdin = child.stdin.take().ok_or_else(|| 
            AgentSpaceError::AgentRuntime("Failed to get stdin handle".to_string()))?;
        
        let stdout = child.stdout.take().ok_or_else(|| 
            AgentSpaceError::AgentRuntime("Failed to get stdout handle".to_string()))?;

        let stderr = child.stderr.take().ok_or_else(|| 
            AgentSpaceError::AgentRuntime("Failed to get stderr handle".to_string()))?;

        // Set up IPC channels
        let (response_sender, response_receiver) = mpsc::channel(100);
        *self.response_receiver.lock().await = Some(response_receiver);
        *self.stdin_writer.lock().await = Some(stdin);
        *self.process.lock().await = Some(child);
        *self.is_running.write().await = true;

        // Start stdout/stderr monitoring tasks
        self.start_output_monitoring(stdout, stderr, response_sender).await;

        // Send initial configuration to the Python process
        self.send_configuration().await?;

        info!("Python agent process started: {}", self.agent_id);
        Ok(())
    }

    /// Stop the Python agent process
    pub async fn stop(&self) -> Result<()> {
        info!("Stopping Python agent process: {}", self.agent_id);

        *self.is_running.write().await = false;

        // Send stop message to Python process
        let stop_message = IPCMessage {
            id: Uuid::new_v4().to_string(),
            message_type: IPCMessageType::Stop,
            payload: Value::Null,
            timestamp: Utc::now(),
        };

        if let Err(e) = self.send_message(stop_message).await {
            warn!("Failed to send stop message: {}", e);
        }

        // Give the process a moment to shut down gracefully
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

        // Force kill if still running
        if let Some(mut child) = self.process.lock().await.take() {
            if let Err(e) = child.kill().await {
                warn!("Failed to kill Python process: {}", e);
            } else {
                let _ = child.wait().await;
            }
        }

        // Clean up resources
        *self.stdin_writer.lock().await = None;
        *self.response_receiver.lock().await = None;

        info!("Python agent process stopped: {}", self.agent_id);
        Ok(())
    }

    /// Execute an action by sending a message to the Python process
    pub async fn execute_action(&self, action_name: &str, params: Value) -> Result<Value> {
        debug!("Executing action '{}' on agent {}", action_name, self.agent_id);

        if !*self.is_running.read().await {
            return Err(AgentSpaceError::AgentRuntime("Agent is not running".to_string()));
        }

        let request_id = Uuid::new_v4().to_string();
        let message = IPCMessage {
            id: request_id.clone(),
            message_type: IPCMessageType::Execute {
                method: action_name.to_string(),
                params,
            },
            payload: Value::Null,
            timestamp: Utc::now(),
        };

        // Send the message
        self.send_message(message).await?;

        // Wait for response
        let result = self.wait_for_response(&request_id).await?;

        // Emit event
        let event = AgentEvent {
            event_id: Uuid::new_v4(),
            agent_id: self.agent_id,
            event_type: EventType::ActionCompleted,
            payload: serde_json::json!({
                "action": action_name,
                "result": result
            }),
            timestamp: Utc::now(),
        };

        if let Err(e) = self.event_sender.send(event).await {
            warn!("Failed to send event: {}", e);
        }

        Ok(result)
    }

    /// Handle a trigger event by sending it to the Python process
    pub async fn handle_trigger(&self, trigger_type: &TriggerType, data: Value) -> Result<()> {
        debug!("Handling trigger {:?} for agent {}", trigger_type, self.agent_id);

        if !*self.is_running.read().await {
            return Err(AgentSpaceError::AgentRuntime("Agent is not running".to_string()));
        }

        let request_id = Uuid::new_v4().to_string();
        let message = IPCMessage {
            id: request_id.clone(),
            message_type: IPCMessageType::Trigger {
                trigger_type: format!("{:?}", trigger_type),
                data: data.clone(),
            },
            payload: Value::Null,
            timestamp: Utc::now(),
        };

        // Send the trigger message
        self.send_message(message).await?;

        // Wait for response (triggers are async, so we don't wait for result)
        // Instead, just wait for acknowledgment
        let _result = self.wait_for_response(&request_id).await?;

        // Emit event
        let event = AgentEvent {
            event_id: Uuid::new_v4(),
            agent_id: self.agent_id,
            event_type: EventType::TriggerFired,
            payload: serde_json::json!({
                "trigger_type": format!("{:?}", trigger_type),
                "data": data
            }),
            timestamp: Utc::now(),
        };

        if let Err(e) = self.event_sender.send(event).await {
            warn!("Failed to send trigger event: {}", e);
        }

        Ok(())
    }

    /// Get agent status from Python process
    pub async fn get_status(&self) -> Result<Value> {
        if !*self.is_running.read().await {
            return Ok(serde_json::json!({
                "status": "stopped",
                "agent_id": self.agent_id,
                "uptime": 0
            }));
        }

        let request_id = Uuid::new_v4().to_string();
        let message = IPCMessage {
            id: request_id.clone(),
            message_type: IPCMessageType::Status,
            payload: Value::Null,
            timestamp: Utc::now(),
        };

        self.send_message(message).await?;
        self.wait_for_response(&request_id).await
    }

    /// Send initial configuration to the Python process
    async fn send_configuration(&self) -> Result<()> {
        let config_message = IPCMessage {
            id: Uuid::new_v4().to_string(),
            message_type: IPCMessageType::Execute {
                method: "configure".to_string(),
                params: serde_json::to_value(&self.agent_config)?,
            },
            payload: Value::Null,
            timestamp: Utc::now(),
        };

        self.send_message(config_message).await
    }

    /// Send a message to the Python process
    async fn send_message(&self, message: IPCMessage) -> Result<()> {
        let json_message = serde_json::to_string(&message)?;
        
        if let Some(stdin) = self.stdin_writer.lock().await.as_mut() {
            stdin.write_all(json_message.as_bytes()).await
                .map_err(|e| AgentSpaceError::AgentRuntime(
                    format!("Failed to write to Python process: {}", e)
                ))?;
            stdin.write_all(b"\n").await
                .map_err(|e| AgentSpaceError::AgentRuntime(
                    format!("Failed to write newline to Python process: {}", e)
                ))?;
            stdin.flush().await
                .map_err(|e| AgentSpaceError::AgentRuntime(
                    format!("Failed to flush Python process stdin: {}", e)
                ))?;
        } else {
            return Err(AgentSpaceError::AgentRuntime("No stdin handle available".to_string()));
        }

        Ok(())
    }

    /// Wait for a response from the Python process
    async fn wait_for_response(&self, request_id: &str) -> Result<Value> {
        let timeout = tokio::time::Duration::from_secs(self.agent_config.timeout_seconds);
        
        if let Some(mut receiver) = self.response_receiver.lock().await.take() {
            let result = tokio::time::timeout(timeout, async {
                while let Some(message) = receiver.recv().await {
                    match message.message_type {
                        IPCMessageType::Response { request_id: resp_id, result } => {
                            if resp_id == request_id {
                                return Ok(result);
                            }
                        }
                        IPCMessageType::Error { message, traceback } => {
                            return Err(AgentSpaceError::AgentRuntime(
                                format!("Python error: {} {:?}", message, traceback)
                            ));
                        }
                        _ => {
                            // Handle other message types (events, heartbeats, etc.)
                            self.handle_async_message(message).await;
                        }
                    }
                }
                Err(AgentSpaceError::AgentRuntime("Response channel closed".to_string()))
            }).await;

            // Put the receiver back
            *self.response_receiver.lock().await = Some(receiver);

            match result {
                Ok(value) => value,
                Err(_) => Err(AgentSpaceError::AgentRuntime("Response timeout".to_string())),
            }
        } else {
            Err(AgentSpaceError::AgentRuntime("No response receiver available".to_string()))
        }
    }

    /// Handle asynchronous messages from Python process
    async fn handle_async_message(&self, message: IPCMessage) {
        match message.message_type {
            IPCMessageType::Event { event_type, data } => {
                let event = AgentEvent {
                    event_id: Uuid::new_v4(),
                    agent_id: self.agent_id,
                    event_type: match event_type.as_str() {
                        "action_completed" => EventType::ActionCompleted,
                        "action_failed" => EventType::ActionFailed,
                        "data_received" => EventType::DataReceived,
                        "message_sent" => EventType::MessageSent,
                        "status_changed" => EventType::StatusChanged,
                        _ => EventType::Error,
                    },
                    payload: data,
                    timestamp: message.timestamp,
                };

                if let Err(e) = self.event_sender.send(event).await {
                    warn!("Failed to send async event: {}", e);
                }
            }
            IPCMessageType::Heartbeat => {
                debug!("Received heartbeat from agent {}", self.agent_id);
            }
            _ => {
                debug!("Received unhandled async message: {:?}", message);
            }
        }
    }

    /// Start monitoring stdout and stderr from the Python process
    async fn start_output_monitoring(
        &self,
        stdout: tokio::process::ChildStdout,
        stderr: tokio::process::ChildStderr,
        response_sender: mpsc::Sender<IPCMessage>,
    ) {
        let agent_id = self.agent_id;
        
        // Monitor stdout for IPC messages
        let stdout_sender = response_sender.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(stdout);
            let mut line = String::new();
            
            while let Ok(bytes_read) = reader.read_line(&mut line).await {
                if bytes_read == 0 {
                    break; // EOF
                }
                
                // Try to parse as IPC message
                if let Ok(message) = serde_json::from_str::<IPCMessage>(&line.trim()) {
                    if let Err(e) = stdout_sender.send(message).await {
                        error!("Failed to send IPC message: {}", e);
                        break;
                    }
                } else {
                    // Regular stdout output
                    debug!("Agent {} stdout: {}", agent_id, line.trim());
                }
                
                line.clear();
            }
            
            debug!("Agent {} stdout monitor stopped", agent_id);
        });

        // Monitor stderr for errors
        tokio::spawn(async move {
            let mut reader = BufReader::new(stderr);
            let mut line = String::new();
            
            while let Ok(bytes_read) = reader.read_line(&mut line).await {
                if bytes_read == 0 {
                    break; // EOF
                }
                
                error!("Agent {} stderr: {}", agent_id, line.trim());
                line.clear();
            }
            
            debug!("Agent {} stderr monitor stopped", agent_id);
        });
    }
}

/// Agent factory for creating Python agents
pub struct PythonAgentFactory {
    python_executable: PathBuf,
    agent_wrapper_path: PathBuf,
    agents_directory: PathBuf,
}

impl PythonAgentFactory {
    pub fn new(
        python_executable: PathBuf,
        agent_wrapper_path: PathBuf,
        agents_directory: PathBuf,
    ) -> Self {
        Self {
            python_executable,
            agent_wrapper_path,
            agents_directory,
        }
    }

    /// Create a new agent from a template
    pub async fn create_agent_from_template(
        &self,
        template_name: &str,
        agent_config: AgentConfig,
    ) -> Result<PythonAgentRuntime> {
        let agent_id = Uuid::new_v4();
        
        // Copy template to agent directory
        let template_path = self.agents_directory.join("templates").join(format!("{}.py", template_name));
        let agent_path = self.agents_directory.join("instances").join(format!("{}.py", agent_id));

        tokio::fs::copy(&template_path, &agent_path).await
            .map_err(|e| AgentSpaceError::AgentRuntime(
                format!("Failed to create agent from template: {}", e)
            ))?;

        // Update config with actual path
        let mut config = agent_config;
        config.script_path = agent_path;

        PythonAgentRuntime::new(
            agent_id, 
            config, 
            self.python_executable.clone(),
            self.agent_wrapper_path.clone(),
        ).await
    }

    /// Load an existing agent
    pub async fn load_agent(
        &self,
        agent_id: AgentId,
        config: AgentConfig,
    ) -> Result<PythonAgentRuntime> {
        PythonAgentRuntime::new(
            agent_id, 
            config, 
            self.python_executable.clone(),
            self.agent_wrapper_path.clone(),
        ).await
    }
}
