// Agent Types and Core Definitions
// Defines the fundamental agent structures and behaviors

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use crate::types::{AgentId, Priority, ExecutionMode, Timestamp};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub id: AgentId,
    pub name: String,
    pub description: String,
    pub template: AgentTemplate,
    pub config: AgentConfig,
    pub status: AgentStatus,
    pub capabilities: Vec<AgentCapability>,
    pub metrics: AgentMetrics,
    pub timestamps: Timestamp,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub version: String,
    pub execution_mode: ExecutionMode,
    pub priority: Priority,
    pub max_concurrent_actions: u32,
    pub timeout_seconds: u64,
    pub retry_attempts: u32,
    pub memory_limit_mb: u64,
    pub environment_variables: HashMap<String, String>,
    pub data_sources: Vec<String>,
    pub triggers: Vec<String>,
    pub permissions: Vec<String>,
    pub python_config: Option<PythonAgentConfig>,
    pub javascript_config: Option<JavaScriptAgentConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PythonAgentConfig {
    pub entry_point: String,
    pub requirements: Vec<String>,
    pub virtual_env: Option<String>,
    pub langchain_config: Option<LangChainConfig>,
    pub langgraph_config: Option<LangGraphConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JavaScriptAgentConfig {
    pub entry_point: String,
    pub dependencies: Vec<String>,
    pub node_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LangChainConfig {
    pub model_provider: String,
    pub model_name: String,
    pub temperature: f32,
    pub max_tokens: u32,
    pub memory_type: String,
    pub tools: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LangGraphConfig {
    pub workflow_file: String,
    pub state_schema: String,
    pub checkpointing: bool,
    pub parallel_execution: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentTemplate {
    // Personal productivity agents
    PersonalAssistant {
        specialization: PersonalAssistantType,
    },
    ResearchAssistant {
        domain: ResearchDomain,
        depth: ResearchDepth,
    },
    ProductivityManager {
        methodology: ProductivityMethodology,
    },
    
    // Data and analysis agents
    DataAnalyst {
        data_types: Vec<String>,
        analysis_types: Vec<String>,
    },
    FinanceTracker {
        account_types: Vec<String>,
        reporting_frequency: String,
    },
    HealthMonitor {
        metrics: Vec<String>,
        tracking_frequency: String,
    },
    
    // Creative and content agents
    ContentCreator {
        content_types: Vec<String>,
        platforms: Vec<String>,
    },
    LearningCompanion {
        subjects: Vec<String>,
        learning_style: String,
    },
    JournalAssistant {
        journal_type: String,
        frequency: String,
    },
    
    // Development and technical agents
    DeveloperCompanion {
        languages: Vec<String>,
        frameworks: Vec<String>,
        specializations: Vec<String>,
    },
    SystemMonitor {
        monitored_systems: Vec<String>,
        alert_thresholds: HashMap<String, f64>,
    },
    DataCurator {
        data_sources: Vec<String>,
        curation_rules: Vec<String>,
    },
    
    // Custom agent
    CustomAgent {
        custom_type: String,
        custom_config: HashMap<String, serde_json::Value>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PersonalAssistantType {
    GeneralPurpose,
    ScheduleManager,
    TaskCoordinator,
    CommunicationManager,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ResearchDomain {
    Academic,
    Business,
    Technology,
    Health,
    Finance,
    General,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ResearchDepth {
    Summary,
    Detailed,
    Comprehensive,
    Expert,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProductivityMethodology {
    GettingThingsDone,
    TimeBlocking,
    Pomodoro,
    Kanban,
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentStatus {
    Draft,          // Being configured
    Ready,          // Configured but not running
    Running,        // Currently executing
    Paused,         // Temporarily stopped
    Error(String),  // Error state with message
    Stopped,        // Intentionally stopped
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentCapability {
    // Data capabilities
    ReadFiles,
    WriteFiles,
    AccessDatabase,
    AccessInternet,
    
    // Communication capabilities
    SendEmail,
    SendNotifications,
    MakeApiCalls,
    WebhookReceiver,
    
    // AI capabilities
    TextGeneration,
    TextAnalysis,
    ImageAnalysis,
    CodeGeneration,
    
    // System capabilities
    ExecuteCommands,
    FileSystemWatch,
    NetworkMonitoring,
    ProcessManagement,
    
    // Custom capabilities
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMetrics {
    pub total_executions: u64,
    pub successful_executions: u64,
    pub failed_executions: u64,
    pub average_execution_time_ms: f64,
    pub last_execution: Option<DateTime<Utc>>,
    pub total_runtime_ms: u64,
    pub memory_usage_mb: f64,
    pub cpu_usage_percent: f64,
    pub data_processed_bytes: u64,
    pub actions_performed: u64,
    pub errors_encountered: u64,
    pub custom_metrics: HashMap<String, f64>,
}

impl Default for AgentMetrics {
    fn default() -> Self {
        Self {
            total_executions: 0,
            successful_executions: 0,
            failed_executions: 0,
            average_execution_time_ms: 0.0,
            last_execution: None,
            total_runtime_ms: 0,
            memory_usage_mb: 0.0,
            cpu_usage_percent: 0.0,
            data_processed_bytes: 0,
            actions_performed: 0,
            errors_encountered: 0,
            custom_metrics: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentAction {
    pub id: Uuid,
    pub agent_id: AgentId,
    pub action_type: ActionType,
    pub input_data: serde_json::Value,
    pub output_data: Option<serde_json::Value>,
    pub status: ActionStatus,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ActionType {
    // Data operations
    ReadData(String),
    WriteData(String),
    ProcessData(String),
    
    // Communication operations
    SendMessage(String),
    SendEmail(String),
    PostWebhook(String),
    
    // AI operations
    GenerateText(String),
    AnalyzeText(String),
    RunLangChain(String),
    RunLangGraph(String),
    
    // System operations
    ExecuteCommand(String),
    WatchFile(String),
    ScheduleTask(String),
    
    // Custom operations
    Custom(String, serde_json::Value),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ActionStatus {
    Pending,
    Running,
    Completed,
    Failed(String),
    Cancelled,
}

impl Agent {
    pub fn new(name: String, template: AgentTemplate) -> Self {
        Self {
            id: Uuid::new_v4(),
            name,
            description: String::new(),
            template,
            config: AgentConfig::default(),
            status: AgentStatus::Draft,
            capabilities: Vec::new(),
            metrics: AgentMetrics::default(),
            timestamps: Timestamp::default(),
        }
    }

    pub fn is_active(&self) -> bool {
        matches!(self.status, AgentStatus::Running)
    }

    pub fn can_execute(&self) -> bool {
        matches!(self.status, AgentStatus::Ready | AgentStatus::Running)
    }

    pub fn update_metrics(&mut self, execution_time_ms: u64, success: bool) {
        self.metrics.total_executions += 1;
        if success {
            self.metrics.successful_executions += 1;
        } else {
            self.metrics.failed_executions += 1;
        }
        
        // Update average execution time
        let total_time = self.metrics.average_execution_time_ms * (self.metrics.total_executions - 1) as f64;
        self.metrics.average_execution_time_ms = 
            (total_time + execution_time_ms as f64) / self.metrics.total_executions as f64;
        
        self.metrics.last_execution = Some(Utc::now());
        self.timestamps.updated_at = Utc::now();
    }
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            version: "1.0.0".to_string(),
            execution_mode: ExecutionMode::Asynchronous,
            priority: Priority::Normal,
            max_concurrent_actions: 5,
            timeout_seconds: 300,
            retry_attempts: 3,
            memory_limit_mb: 256,
            environment_variables: HashMap::new(),
            data_sources: Vec::new(),
            triggers: Vec::new(),
            permissions: Vec::new(),
            python_config: None,
            javascript_config: None,
        }
    }
}
