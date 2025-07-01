// Schedulers
// Time-based scheduling

use crate::errors::Result;

pub struct CronScheduler;

impl CronScheduler {
    pub fn new() -> Self {
        Self
    }

    pub async fn start(&self) -> Result<()> {
        // TODO: Implement cron scheduling
        Ok(())
    }
}

impl Default for CronScheduler {
    fn default() -> Self {
        Self::new()
    }
}
