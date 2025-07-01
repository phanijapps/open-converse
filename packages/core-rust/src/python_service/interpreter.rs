// Python Interpreter Management
// Handles the embedded Python interpreter lifecycle and execution

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use pyo3::prelude::*;
use pyo3::types::{PyDict, PyModule, PyTuple, PyList, PyBool, PyString, PyFloat, PyInt};
use tracing::{info, warn, error, debug};

use crate::errors::{AgentSpaceError, Result};

// For Debug implementation
impl std::fmt::Debug for PythonInterpreter {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PythonInterpreter")
            .field("is_ready", &"<async_field>")
            .field("execution_count", &"<async_field>")
            .finish()
    }
}

pub struct PythonInterpreter {
    global_namespace: Arc<RwLock<Option<Py<PyDict>>>>,
    imported_modules: Arc<RwLock<HashMap<String, Py<PyModule>>>>,
    execution_count: Arc<RwLock<u64>>,
    is_ready: Arc<RwLock<bool>>,
}

impl PythonInterpreter {
    /// Create a new Python interpreter instance
    pub async fn new() -> Result<Self> {
        debug!("Creating new Python interpreter");

        let interpreter = Self {
            global_namespace: Arc::new(RwLock::new(None)),
            imported_modules: Arc::new(RwLock::new(HashMap::new())),
            execution_count: Arc::new(RwLock::new(0)),
            is_ready: Arc::new(RwLock::new(false)),
        };

        interpreter.initialize().await?;
        Ok(interpreter)
    }

    /// Initialize the Python interpreter
    async fn initialize(&self) -> Result<()> {
        debug!("Initializing Python interpreter");

        Python::with_gil(|py| -> PyResult<()> {
            // Create global namespace
            let main_module = py.import("__main__")?;
            let global_dict = main_module.dict();
            
            // Store the global namespace
            let global_namespace = global_dict.copy()?;
            *self.global_namespace.blocking_write() = Some(global_namespace.into());

            // Set up basic imports
            let setup_code = r#"
import sys
import os
import json
import traceback
from typing import Any, Dict, List, Optional, Union

# Setup for agent space
class AgentSpaceContext:
    def __init__(self):
        self.data = {}
        self.results = {}
        self.errors = []
    
    def set_data(self, key: str, value: Any):
        self.data[key] = value
    
    def get_data(self, key: str, default: Any = None):
        return self.data.get(key, default)
    
    def add_result(self, key: str, value: Any):
        self.results[key] = value
    
    def add_error(self, error: str):
        self.errors.append(error)

# Create global context
_agent_context = AgentSpaceContext()

def get_context():
    return _agent_context

# Helper functions for agent development
def log_info(message: str):
    print(f"[INFO] {message}")

def log_warning(message: str):
    print(f"[WARNING] {message}")

def log_error(message: str):
    print(f"[ERROR] {message}")
"#;

            py.run(setup_code, Some(global_dict), None)?;
            
            Ok(())
        })?;

        *self.is_ready.write().await = true;
        info!("Python interpreter initialized successfully");
        Ok(())
    }

    /// Execute Python code in the interpreter
    pub async fn execute_code(&self, code: &str) -> Result<serde_json::Value> {
        if !*self.is_ready.read().await {
            return Err(AgentSpaceError::PythonService("Interpreter not ready".to_string()));
        }

        debug!("Executing Python code (length: {})", code.len());

        let result = Python::with_gil(|py| -> PyResult<serde_json::Value> {
            let global_namespace = self.global_namespace.blocking_read();
            let globals = global_namespace.as_ref()
                .ok_or_else(|| PyErr::new::<pyo3::exceptions::PyRuntimeError, _>("Global namespace not initialized"))?
                .as_ref(py);

            // Create a local namespace for this execution
            let locals = PyDict::new(py);

            // Execute the code
            match py.run(code, Some(globals), Some(locals)) {
                Ok(_) => {
                    // Try to get the result from locals or globals
                    if let Ok(result) = locals.get_item("result") {
                        if let Some(result_obj) = result {
                            return self.python_to_json(py, result_obj);
                        }
                    }

                    // If no explicit result, return execution info
                    Ok(serde_json::json!({
                        "status": "executed",
                        "locals": self.dict_to_json(py, locals)?,
                    }))
                }
                Err(e) => {
                    error!("Python code execution failed: {}", e);
                    Ok(serde_json::json!({
                        "status": "error",
                        "error": e.to_string(),
                        "traceback": self.get_traceback(py)
                    }))
                }
            }
        })?;

        // Increment execution counter
        *self.execution_count.write().await += 1;

        Ok(result)
    }

    /// Import a Python module and cache it
    pub async fn import_module(&self, module_name: &str) -> Result<()> {
        debug!("Importing Python module: {}", module_name);

        Python::with_gil(|py| -> PyResult<()> {
            let module = py.import(module_name)?;
            
            // Cache the module
            let mut modules = self.imported_modules.blocking_write();
            modules.insert(module_name.to_string(), module.into());
            
            Ok(())
        })?;

        info!("Successfully imported module: {}", module_name);
        Ok(())
    }

    /// Get a cached module
    pub async fn get_module(&self, module_name: &str) -> Option<Py<PyModule>> {
        let modules = self.imported_modules.read().await;
        modules.get(module_name).cloned()
    }

    /// Execute a function from a cached module
    pub async fn call_module_function(
        &self,
        module_name: &str,
        function_name: &str,
        args: Vec<serde_json::Value>,
    ) -> Result<serde_json::Value> {
        debug!("Calling function {}.{}", module_name, function_name);

        let module = self.get_module(module_name).await
            .ok_or_else(|| AgentSpaceError::PythonService(format!("Module not found: {}", module_name)))?;

        Python::with_gil(|py| -> PyResult<serde_json::Value> {
            let module_ref = module.as_ref(py);
            let function = module_ref.getattr(function_name)?;

            // Convert JSON args to Python objects
            let py_args = args.into_iter()
                .map(|arg| self.json_to_python(py, arg))
                .collect::<PyResult<Vec<_>>>()?;

            // Call the function
            let result = if py_args.is_empty() {
                function.call0()?
            } else {
                let tuple_args = PyTuple::new(py, &py_args);
                function.call1(tuple_args)?
            };

            // Convert result back to JSON
            self.python_to_json(py, result)
        })
        .map_err(AgentSpaceError::from)
    }

    /// Set a global variable in the interpreter
    pub async fn set_global(&self, name: &str, value: serde_json::Value) -> Result<()> {
        debug!("Setting global variable: {}", name);

        Python::with_gil(|py| -> PyResult<()> {
            let global_namespace = self.global_namespace.blocking_read();
            let globals = global_namespace.as_ref()
                .ok_or_else(|| PyErr::new::<pyo3::exceptions::PyRuntimeError, _>("Global namespace not initialized"))?
                .as_ref(py);

            let py_value = self.json_to_python(py, value)?;
            globals.set_item(name, py_value)?;

            Ok(())
        })?;

        Ok(())
    }

    /// Get a global variable from the interpreter
    pub async fn get_global(&self, name: &str) -> Result<Option<serde_json::Value>> {
        debug!("Getting global variable: {}", name);

        Python::with_gil(|py| -> PyResult<Option<serde_json::Value>> {
            let global_namespace = self.global_namespace.blocking_read();
            let globals = global_namespace.as_ref()
                .ok_or_else(|| PyErr::new::<pyo3::exceptions::PyRuntimeError, _>("Global namespace not initialized"))?
                .as_ref(py);

            match globals.get_item(name)? {
                Some(value) => Ok(Some(self.python_to_json(py, value)?)),
                None => Ok(None),
            }
        })
        .map_err(AgentSpaceError::from)
    }

    /// Get interpreter statistics
    pub async fn get_statistics(&self) -> InterpreterStatistics {
        InterpreterStatistics {
            execution_count: *self.execution_count.read().await,
            imported_modules: self.imported_modules.read().await.len(),
            is_ready: *self.is_ready.read().await,
        }
    }

    /// Shutdown the interpreter
    pub async fn shutdown(&self) -> Result<()> {
        info!("Shutting down Python interpreter");

        *self.is_ready.write().await = false;
        
        // Clear caches
        self.imported_modules.write().await.clear();
        *self.global_namespace.write().await = None;

        Ok(())
    }

    /// Convert Python object to JSON
    fn python_to_json(&self, py: Python, obj: &PyAny) -> PyResult<serde_json::Value> {
        if obj.is_none() {
            Ok(serde_json::Value::Null)
        } else if let Ok(b) = obj.extract::<bool>() {
            Ok(serde_json::Value::Bool(b))
        } else if let Ok(i) = obj.extract::<i64>() {
            Ok(serde_json::Value::Number(serde_json::Number::from(i)))
        } else if let Ok(f) = obj.extract::<f64>() {
            Ok(serde_json::json!(f))
        } else if let Ok(s) = obj.extract::<String>() {
            Ok(serde_json::Value::String(s))
        } else if let Ok(list) = obj.downcast::<pyo3::types::PyList>() {
            let mut vec = Vec::new();
            for item in list.iter() {
                vec.push(self.python_to_json(py, item)?);
            }
            Ok(serde_json::Value::Array(vec))
        } else if let Ok(dict) = obj.downcast::<pyo3::types::PyDict>() {
            self.dict_to_json(py, dict)
        } else {
            // Fallback: convert to string
            Ok(serde_json::Value::String(obj.to_string()))
        }
    }

    /// Convert Python dict to JSON
    fn dict_to_json(&self, py: Python, dict: &PyDict) -> PyResult<serde_json::Value> {
        let mut map = serde_json::Map::new();
        for (key, value) in dict.iter() {
            let key_str = key.to_string();
            let value_json = self.python_to_json(py, value)?;
            map.insert(key_str, value_json);
        }
        Ok(serde_json::Value::Object(map))
    }

    /// Convert JSON to Python object
    fn json_to_python(&self, py: Python, value: serde_json::Value) -> PyResult<PyObject> {
        match value {
            serde_json::Value::Null => Ok(py.None()),
            serde_json::Value::Bool(b) => Ok(b.into_py(py)),
            serde_json::Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    Ok(i.into_py(py))
                } else if let Some(f) = n.as_f64() {
                    Ok(f.into_py(py))
                } else {
                    Ok(n.to_string().into_py(py))
                }
            }
            serde_json::Value::String(s) => Ok(s.into_py(py)),
            serde_json::Value::Array(arr) => {
                let py_list = pyo3::types::PyList::empty(py);
                for item in arr {
                    py_list.append(self.json_to_python(py, item)?)?;
                }
                Ok(py_list.into())
            }
            serde_json::Value::Object(obj) => {
                let py_dict = PyDict::new(py);
                for (key, value) in obj {
                    py_dict.set_item(key, self.json_to_python(py, value)?)?;
                }
                Ok(py_dict.into())
            }
        }
    }

    /// Get Python traceback as string
    fn get_traceback(&self, _py: Python) -> String {
        Python::with_gil(|py| {
            match py.import("traceback") {
                Ok(traceback_module) => {
                    match traceback_module.call_method0("format_exc") {
                        Ok(tb) => tb.to_string(),
                        Err(_) => "Unable to get traceback".to_string(),
                    }
                }
                Err(_) => "Traceback module not available".to_string(),
            }
        })
    }
}

#[derive(Debug, Clone)]
pub struct InterpreterStatistics {
    pub execution_count: u64,
    pub imported_modules: usize,
    pub is_ready: bool,
}
