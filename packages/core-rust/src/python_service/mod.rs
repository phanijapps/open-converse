// Python Service Module
// Embedded Python runtime for LangChain and LangGraph integration

pub mod interpreter;
pub mod langchain_bridge;
pub mod langgraph_service;
pub mod bindings;
pub mod agent_runtime;

// Re-export key types
pub use interpreter::PythonInterpreter;
pub use langchain_bridge::LangChainBridge;
pub use langgraph_service::LangGraphService;
pub use agent_runtime::{PythonAgent, PythonWorkflow};

use std::sync::Arc;
use tokio::sync::RwLock;
use pyo3::prelude::*;
use tracing::{info, warn, error, debug};

use crate::errors::{AgentSpaceError, Result};

pub struct PythonService {
    interpreter: Arc<RwLock<PythonInterpreter>>,
    langchain_bridge: Arc<LangChainBridge>,
    langgraph_service: Arc<LangGraphService>,
    is_initialized: Arc<RwLock<bool>>,
}

impl PythonService {
    /// Create a new Python service instance
    pub async fn new() -> Result<Self> {
        info!("Initializing Python service");

        // Initialize Python interpreter
        let interpreter = Arc::new(RwLock::new(PythonInterpreter::new().await?));

        // Create service components
        let langchain_bridge = Arc::new(LangChainBridge::new(interpreter.clone()).await?);
        let langgraph_service = Arc::new(LangGraphService::new(interpreter.clone()).await?);

        let service = Self {
            interpreter,
            langchain_bridge,
            langgraph_service,
            is_initialized: Arc::new(RwLock::new(false)),
        };

        // Initialize the service
        service.initialize().await?;

        info!("Python service initialized successfully");
        Ok(service)
    }

    /// Initialize the Python service and load required modules
    async fn initialize(&self) -> Result<()> {
        debug!("Initializing Python service components");

        // Initialize Python modules
        Python::with_gil(|py| -> PyResult<()> {
            // Import required Python modules
            py.import("sys")?;
            py.import("os")?;
            py.import("json")?;
            
            // Try to import LangChain modules
            match py.import("langchain") {
                Ok(_) => info!("LangChain module loaded successfully"),
                Err(e) => warn!("LangChain module not available: {}", e),
            }

            // Try to import LangGraph modules
            match py.import("langgraph") {
                Ok(_) => info!("LangGraph module loaded successfully"),
                Err(e) => warn!("LangGraph module not available: {}", e),
            }

            Ok(())
        })?;

        // Initialize bridges
        self.langchain_bridge.initialize().await?;
        self.langgraph_service.initialize().await?;

        *self.is_initialized.write().await = true;
        Ok(())
    }

    /// Generate text using Python-based models
    pub async fn generate_text(&self, prompt: &str) -> Result<String> {
        if !*self.is_initialized.read().await {
            return Err(AgentSpaceError::PythonService("Python service not initialized".to_string()));
        }

        debug!("Generating text with prompt length: {}", prompt.len());

        self.langchain_bridge.generate_text(prompt).await
    }

    /// Analyze text using Python-based models
    pub async fn analyze_text(&self, text: &str) -> Result<serde_json::Value> {
        if !*self.is_initialized.read().await {
            return Err(AgentSpaceError::PythonService("Python service not initialized".to_string()));
        }

        debug!("Analyzing text with length: {}", text.len());

        self.langchain_bridge.analyze_text(text).await
    }

    /// Run a LangChain workflow
    pub async fn run_langchain(&self, config: &str, input_data: &serde_json::Value) -> Result<serde_json::Value> {
        if !*self.is_initialized.read().await {
            return Err(AgentSpaceError::PythonService("Python service not initialized".to_string()));
        }

        debug!("Running LangChain workflow with config: {}", config);

        self.langchain_bridge.run_workflow(config, input_data).await
    }

    /// Run a LangGraph workflow
    pub async fn run_langgraph(&self, config: &str, input_data: &serde_json::Value) -> Result<serde_json::Value> {
        if !*self.is_initialized.read().await {
            return Err(AgentSpaceError::PythonService("Python service not initialized".to_string()));
        }

        debug!("Running LangGraph workflow with config: {}", config);

        self.langgraph_service.run_workflow(config, input_data).await
    }

    /// Execute Python code directly
    pub async fn execute_code(&self, code: &str) -> Result<serde_json::Value> {
        if !*self.is_initialized.read().await {
            return Err(AgentSpaceError::PythonService("Python service not initialized".to_string()));
        }

        debug!("Executing Python code");

        let interpreter = self.interpreter.read().await;
        interpreter.execute_code(code).await
    }

    /// Create a new Python agent
    pub async fn create_agent(&self, agent_type: &str, config: serde_json::Value) -> Result<PythonAgent> {
        if !*self.is_initialized.read().await {
            return Err(AgentSpaceError::PythonService("Python service not initialized".to_string()));
        }

        debug!("Creating Python agent of type: {}", agent_type);

        agent_runtime::PythonAgent::new(
            agent_type.to_string(),
            config,
            self.interpreter.clone(),
            self.langchain_bridge.clone(),
        ).await
    }

    /// Create a new Python workflow
    pub async fn create_workflow(&self, workflow_type: &str, config: serde_json::Value) -> Result<PythonWorkflow> {
        if !*self.is_initialized.read().await {
            return Err(AgentSpaceError::PythonService("Python service not initialized".to_string()));
        }

        debug!("Creating Python workflow of type: {}", workflow_type);

        agent_runtime::PythonWorkflow::new(
            workflow_type.to_string(),
            config,
            self.interpreter.clone(),
            self.langgraph_service.clone(),
        ).await
    }

    /// Install a Python package
    pub async fn install_package(&self, package: &str) -> Result<()> {
        debug!("Installing Python package: {}", package);
        
        let code = format!("import subprocess; subprocess.check_call(['pip', 'install', '{}'])", package);
        self.execute_code(&code).await?;
        
        info!("Installed Python package: {}", package);
        Ok(())
    }

    /// Set environment variable in Python
    pub async fn set_environment_variable(&self, key: &str, value: &str) -> Result<()> {
        let code = format!("import os; os.environ['{}'] = '{}'", key, value);
        self.execute_code(&code).await?;
        Ok(())
    }

    /// Check if a function exists in the Python environment
    pub async fn has_function(&self, function_name: &str) -> Result<bool> {
        let code = format!("callable(globals().get('{}', None))", function_name);
        let result = self.execute_code(&code).await?;
        
        Ok(result.as_bool().unwrap_or(false))
    }

    /// Call a Python function with arguments
    pub async fn call_function(&self, function_name: &str, args: Vec<serde_json::Value>) -> Result<serde_json::Value> {
        self.interpreter.read().await.call_module_function("__main__", function_name, args).await
    }

    /// Execute a Python script/module
    pub async fn execute_script(&self, script_content: &str) -> Result<serde_json::Value> {
        self.execute_code(script_content).await
    }

    /// Get Python service status
    pub async fn get_status(&self) -> PythonServiceStatus {
        PythonServiceStatus {
            is_initialized: *self.is_initialized.read().await,
            python_version: self.get_python_version().await,
            available_modules: self.get_available_modules().await,
            memory_usage: self.get_memory_usage().await,
        }
    }

    /// Get Python version
    async fn get_python_version(&self) -> String {
        Python::with_gil(|py| {
            match py.import("sys") {
                Ok(sys_module) => {
                    match sys_module.getattr("version") {
                        Ok(version) => version.to_string(),
                        Err(_) => "Unknown".to_string(),
                    }
                }
                Err(_) => "Unknown".to_string(),
            }
        })
    }

    /// Get available Python modules
    async fn get_available_modules(&self) -> Vec<String> {
        let modules = vec![
            "langchain",
            "langgraph", 
            "openai",
            "anthropic",
            "numpy",
            "pandas",
            "requests",
            "json",
            "os",
            "sys",
        ];

        let mut available = Vec::new();
        
        Python::with_gil(|py| {
            for module in modules {
                if py.import(module).is_ok() {
                    available.push(module.to_string());
                }
            }
        });

        available
    }

    /// Get Python memory usage (simplified)
    async fn get_memory_usage(&self) -> u64 {
        // This is a placeholder - actual implementation would use Python's
        // resource module or psutil to get real memory usage
        0
    }

    /// Shutdown the Python service
    pub async fn shutdown(&self) -> Result<()> {
        info!("Shutting down Python service");

        *self.is_initialized.write().await = false;

        // Cleanup Python interpreter
        let interpreter = self.interpreter.write().await;
        interpreter.shutdown().await?;

        info!("Python service shut down successfully");
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct PythonServiceStatus {
    pub is_initialized: bool,
    pub python_version: String,
    pub available_modules: Vec<String>,
    pub memory_usage: u64,
}

// Convert Python errors to our error type
impl From<PyErr> for AgentSpaceError {
    fn from(err: PyErr) -> Self {
        AgentSpaceError::PythonService(format!("Python error: {}", err))
    }
}
