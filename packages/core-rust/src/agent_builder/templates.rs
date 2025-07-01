// Agent Templates

use crate::agent_runtime::types::AgentTemplate;

pub fn get_personal_assistant_template() -> AgentTemplate {
    AgentTemplate::PersonalAssistant {
        specialization: crate::agent_runtime::types::PersonalAssistantType::GeneralPurpose,
    }
}

pub fn get_research_assistant_template() -> AgentTemplate {
    AgentTemplate::ResearchAssistant {
        domain: crate::agent_runtime::types::ResearchDomain::General,
        depth: crate::agent_runtime::types::ResearchDepth::Detailed,
    }
}

pub fn get_all_templates() -> Vec<AgentTemplate> {
    vec![
        get_personal_assistant_template(),
        get_research_assistant_template(),
    ]
}
