// Agent Scheduler
// Handles time-based and event-based scheduling of agent actions

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{RwLock, mpsc};
use uuid::Uuid;
use chrono::{DateTime, Utc, Duration, Datelike};
use cron::Schedule;
use std::str::FromStr;
use tracing::{info, error, debug};

use crate::errors::{AgentSpaceError, Result};
use crate::types::AgentId;
use super::types::AgentAction;

pub struct AgentScheduler {
    schedule_rules: Arc<RwLock<HashMap<Uuid, ScheduleRule>>>,
    action_sender: mpsc::Sender<ScheduledAction>,
    _action_receiver: Arc<tokio::sync::Mutex<mpsc::Receiver<ScheduledAction>>>,
    is_running: Arc<RwLock<bool>>,
}

#[derive(Debug, Clone)]
pub struct ScheduleRule {
    pub id: Uuid,
    pub agent_id: AgentId,
    pub name: String,
    pub schedule_type: ScheduleType,
    pub action_template: AgentAction,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub last_triggered: Option<DateTime<Utc>>,
    pub next_trigger: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone)]
pub enum ScheduleType {
    Cron(String),                    // Cron expression
    Interval(Duration),              // Fixed interval
    Once(DateTime<Utc>),            // One-time at specific time
    Daily(chrono::NaiveTime),       // Daily at specific time
    Weekly(chrono::Weekday, chrono::NaiveTime), // Weekly on specific day/time
    Monthly(u32, chrono::NaiveTime), // Monthly on specific day/time
}

#[derive(Debug, Clone)]
struct ScheduledAction {
    rule_id: Uuid,
    agent_id: AgentId,
    action: AgentAction,
    scheduled_time: DateTime<Utc>,
}

impl AgentScheduler {
    pub fn new() -> Self {
        let (action_sender, action_receiver) = mpsc::channel(1000);

        Self {
            schedule_rules: Arc::new(RwLock::new(HashMap::new())),
            action_sender,
            _action_receiver: Arc::new(tokio::sync::Mutex::new(action_receiver)),
            is_running: Arc::new(RwLock::new(false)),
        }
    }

    /// Start the scheduler
    pub async fn start(&self) -> Result<()> {
        info!("Starting agent scheduler");
        *self.is_running.write().await = true;

        // Start the scheduling loop
        self.start_scheduling_loop().await?;

        info!("Agent scheduler started successfully");
        Ok(())
    }

    /// Stop the scheduler
    pub async fn stop(&self) -> Result<()> {
        info!("Stopping agent scheduler");
        *self.is_running.write().await = false;
        Ok(())
    }

    /// Add a new schedule rule
    pub async fn add_rule(&self, agent_id: AgentId, mut rule: ScheduleRule) -> Result<Uuid> {
        debug!("Adding schedule rule for agent: {}", agent_id);

        rule.agent_id = agent_id;
        rule.next_trigger = self.calculate_next_trigger(&rule.schedule_type).await?;

        let rule_id = rule.id;
        self.schedule_rules.write().await.insert(rule_id, rule);

        info!("Schedule rule added: {}", rule_id);
        Ok(rule_id)
    }

    /// Remove a schedule rule
    pub async fn remove_rule(&self, rule_id: Uuid) -> Result<()> {
        debug!("Removing schedule rule: {}", rule_id);

        if self.schedule_rules.write().await.remove(&rule_id).is_some() {
            info!("Schedule rule removed: {}", rule_id);
            Ok(())
        } else {
            Err(AgentSpaceError::AgentRuntime(format!("Schedule rule not found: {}", rule_id)))
        }
    }

    /// Update a schedule rule
    pub async fn update_rule(&self, mut rule: ScheduleRule) -> Result<()> {
        debug!("Updating schedule rule: {}", rule.id);

        rule.next_trigger = self.calculate_next_trigger(&rule.schedule_type).await?;
        
        if self.schedule_rules.write().await.insert(rule.id, rule.clone()).is_some() {
            info!("Schedule rule updated: {}", rule.id);
            Ok(())
        } else {
            Err(AgentSpaceError::AgentRuntime(format!("Schedule rule not found: {}", rule.id)))
        }
    }

    /// Get all rules for an agent
    pub async fn get_agent_rules(&self, agent_id: AgentId) -> Vec<ScheduleRule> {
        self.schedule_rules
            .read()
            .await
            .values()
            .filter(|rule| rule.agent_id == agent_id)
            .cloned()
            .collect()
    }

    /// Get all active rules
    pub async fn get_active_rules(&self) -> Vec<ScheduleRule> {
        self.schedule_rules
            .read()
            .await
            .values()
            .filter(|rule| rule.is_active)
            .cloned()
            .collect()
    }

    /// Activate/deactivate a rule
    pub async fn set_rule_active(&self, rule_id: Uuid, active: bool) -> Result<()> {
        if let Some(rule) = self.schedule_rules.write().await.get_mut(&rule_id) {
            rule.is_active = active;
            if active {
                rule.next_trigger = self.calculate_next_trigger(&rule.schedule_type).await?;
            } else {
                rule.next_trigger = None;
            }
            info!("Schedule rule {} set to active: {}", rule_id, active);
            Ok(())
        } else {
            Err(AgentSpaceError::AgentRuntime(format!("Schedule rule not found: {}", rule_id)))
        }
    }

    /// Start the scheduling loop
    async fn start_scheduling_loop(&self) -> Result<()> {
        let schedule_rules = self.schedule_rules.clone();
        let action_sender = self.action_sender.clone();
        let is_running = self.is_running.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(1));

            while *is_running.read().await {
                interval.tick().await;

                let now = Utc::now();
                let mut rules_to_trigger = Vec::new();

                // Check for rules that need to be triggered
                {
                    let rules = schedule_rules.read().await;
                    for rule in rules.values() {
                        if rule.is_active {
                            if let Some(next_trigger) = rule.next_trigger {
                                if next_trigger <= now {
                                    rules_to_trigger.push(rule.clone());
                                }
                            }
                        }
                    }
                }

                // Trigger rules and update next trigger times
                for mut rule in rules_to_trigger {
                    debug!("Triggering scheduled rule: {}", rule.id);

                    let scheduled_action = ScheduledAction {
                        rule_id: rule.id,
                        agent_id: rule.agent_id,
                        action: rule.action_template.clone(),
                        scheduled_time: now,
                    };

                    if let Err(e) = action_sender.send(scheduled_action).await {
                        error!("Failed to send scheduled action: {}", e);
                        continue;
                    }

                    // Update rule's last triggered time and next trigger
                    rule.last_triggered = Some(now);
                    rule.next_trigger = match Self::calculate_next_trigger_static(&rule.schedule_type, now) {
                        Ok(next) => next,
                        Err(e) => {
                            error!("Failed to calculate next trigger for rule {}: {}", rule.id, e);
                            None
                        }
                    };

                    // Update the rule in the map
                    schedule_rules.write().await.insert(rule.id, rule);
                }
            }
        });

        Ok(())
    }

    /// Calculate the next trigger time for a schedule type
    async fn calculate_next_trigger(&self, schedule_type: &ScheduleType) -> Result<Option<DateTime<Utc>>> {
        Self::calculate_next_trigger_static(schedule_type, Utc::now())
    }

    /// Static version of calculate_next_trigger for use in async contexts
    fn calculate_next_trigger_static(schedule_type: &ScheduleType, from_time: DateTime<Utc>) -> Result<Option<DateTime<Utc>>> {
        match schedule_type {
            ScheduleType::Cron(cron_expr) => {
                let schedule = Schedule::from_str(cron_expr)
                    .map_err(|e| AgentSpaceError::AgentRuntime(format!("Invalid cron expression: {}", e)))?;
                
                Ok(schedule.upcoming(chrono::Utc).next())
            }
            ScheduleType::Interval(duration) => {
                Ok(Some(from_time + *duration))
            }
            ScheduleType::Once(trigger_time) => {
                if *trigger_time > from_time {
                    Ok(Some(*trigger_time))
                } else {
                    Ok(None) // One-time trigger has already passed
                }
            }
            ScheduleType::Daily(time) => {
                let today = from_time.date_naive();
                let today_trigger = today.and_time(*time).and_utc();
                
                if today_trigger > from_time {
                    Ok(Some(today_trigger))
                } else {
                    // Schedule for tomorrow
                    let tomorrow = today + Duration::days(1);
                    Ok(Some(tomorrow.and_time(*time).and_utc()))
                }
            }
            ScheduleType::Weekly(weekday, time) => {
                let current_weekday = from_time.weekday();
                let days_until_target = (weekday.num_days_from_monday() as i64 
                    - current_weekday.num_days_from_monday() as i64 + 7) % 7;
                
                let target_date = if days_until_target == 0 {
                    // Same day, check if time has passed
                    let today_trigger = from_time.date_naive().and_time(*time).and_utc();
                    if today_trigger > from_time {
                        from_time.date_naive()
                    } else {
                        from_time.date_naive() + Duration::days(7)
                    }
                } else {
                    from_time.date_naive() + Duration::days(days_until_target)
                };
                
                Ok(Some(target_date.and_time(*time).and_utc()))
            }
            ScheduleType::Monthly(day, time) => {
                let current_date = from_time.date_naive();
                let current_month = current_date.month();
                let current_year = current_date.year();
                
                // Try this month first
                if let Some(target_date) = chrono::NaiveDate::from_ymd_opt(current_year, current_month, *day) {
                    let target_datetime = target_date.and_time(*time).and_utc();
                    if target_datetime > from_time {
                        return Ok(Some(target_datetime));
                    }
                }
                
                // Try next month
                let (next_year, next_month) = if current_month == 12 {
                    (current_year + 1, 1)
                } else {
                    (current_year, current_month + 1)
                };
                
                if let Some(target_date) = chrono::NaiveDate::from_ymd_opt(next_year, next_month, *day) {
                    Ok(Some(target_date.and_time(*time).and_utc()))
                } else {
                    // Day doesn't exist in next month, try the month after
                    let (next_next_year, next_next_month) = if next_month == 12 {
                        (next_year + 1, 1)
                    } else {
                        (next_year, next_month + 1)
                    };
                    
                    if let Some(target_date) = chrono::NaiveDate::from_ymd_opt(next_next_year, next_next_month, *day) {
                        Ok(Some(target_date.and_time(*time).and_utc()))
                    } else {
                        Err(AgentSpaceError::AgentRuntime(format!("Invalid monthly schedule day: {}", day)))
                    }
                }
            }
        }
    }

    /// Get scheduler statistics
    pub async fn get_statistics(&self) -> SchedulerStatistics {
        let rules = self.schedule_rules.read().await;
        
        let total_rules = rules.len();
        let active_rules = rules.values().filter(|r| r.is_active).count();
        let pending_triggers = rules.values()
            .filter(|r| r.is_active && r.next_trigger.is_some())
            .count();

        let mut schedule_types = HashMap::new();
        for rule in rules.values() {
            let type_name = match &rule.schedule_type {
                ScheduleType::Cron(_) => "Cron",
                ScheduleType::Interval(_) => "Interval",
                ScheduleType::Once(_) => "Once",
                ScheduleType::Daily(_) => "Daily",
                ScheduleType::Weekly(_, _) => "Weekly",
                ScheduleType::Monthly(_, _) => "Monthly",
            };
            *schedule_types.entry(type_name.to_string()).or_insert(0) += 1;
        }

        SchedulerStatistics {
            total_rules,
            active_rules,
            pending_triggers,
            schedule_types,
        }
    }
}

#[derive(Debug, Clone)]
pub struct SchedulerStatistics {
    pub total_rules: usize,
    pub active_rules: usize,
    pub pending_triggers: usize,
    pub schedule_types: HashMap<String, u32>,
}

impl ScheduleRule {
    pub fn new(agent_id: AgentId, name: String, schedule_type: ScheduleType, action_template: AgentAction) -> Self {
        Self {
            id: Uuid::new_v4(),
            agent_id,
            name,
            schedule_type,
            action_template,
            is_active: true,
            created_at: Utc::now(),
            last_triggered: None,
            next_trigger: None,
        }
    }
}

impl Default for AgentScheduler {
    fn default() -> Self {
        Self::new()
    }
}
