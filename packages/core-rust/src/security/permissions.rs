// Permissions

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Permission {
    ReadData(String),
    WriteData(String),
    ExecuteAgent,
    ManageAgents,
    AccessConnector(String),
    SystemAdmin,
    Custom(String),
}

impl Permission {
    pub fn as_string(&self) -> String {
        match self {
            Permission::ReadData(resource) => format!("read:{}", resource),
            Permission::WriteData(resource) => format!("write:{}", resource),
            Permission::ExecuteAgent => "execute:agent".to_string(),
            Permission::ManageAgents => "manage:agents".to_string(),
            Permission::AccessConnector(connector) => format!("access:connector:{}", connector),
            Permission::SystemAdmin => "system:admin".to_string(),
            Permission::Custom(perm) => format!("custom:{}", perm),
        }
    }
}
