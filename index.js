#!/usr/bin/env node
/**
 * Clawd Tier 3 Orchestrator
 * Smart notifications, error handling, logging, cost tracking, content pipeline
 */

const SmartNotifier = require('./smart-notifications.js');
const ErrorHandler = require('./error-handler.js');
const ClawdLogger = require('./logger.js');
const CostTracker = require('./cost-tracker.js');
const ContentPipeline = require('./content-pipeline.js');

class Tier3Orchestrator {
  constructor() {
    this.notifier = SmartNotifier;
    this.errors = new ErrorHandler();
    this.logger = new ClawdLogger();
    this.costs = new CostTracker();
    this.content = new ContentPipeline();
  }

  async initialize() {
    console.log('🚀 Initializing Tier 3...');
    
    // Test connections
    await this.testConnections();
    
    // Schedule daily reset
    this.scheduleDailyReset();
    
    console.log('✅ Tier 3 ready');
  }

  async testConnections() {
    try {
      // Test Supabase
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { data } = await supabase.from('clawd_logs').select('count');
      console.log('✅ Supabase connected');
    } catch (err) {
      console.error('❌ Supabase connection failed:', err.message);
    }
  }

  scheduleDailyReset() {
    // Reset counters at midnight PT
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight - now;
    
    setTimeout(() => {
      this.notifier.resetDaily();
      this.scheduleDailyReset(); // Reschedule
    }, msUntilMidnight);
    
    console.log(`⏰ Daily reset scheduled in ${Math.floor(msUntilMidnight / 1000 / 60)} minutes`);
  }

  // Smart notification (no spam)
  async notify(notification) {
    return await this.notifier.send(notification);
  }

  // Execute with error handling
  async execute(operation, options) {
    return await this.errors.execute(operation, options);
  }

  // Log activity
  async log(event) {
    return await this.logger.log(event);
  }

  // Track costs
  async trackCost(service, usage, details) {
    return await this.costs.track(service, usage, details);
  }

  // Generate content
  async generateContent(type, context) {
    const draft = await this.content.generate(type, context);
    await this.content.queueForApproval(draft);
    return draft;
  }

  // Get health status
  async getHealth() {
    return {
      errors: this.errors.getHealthStatus(),
      costs: await this.costs.getReport(),
      logs: await this.logger.getRecent(24)
    };
  }
}

// Export
module.exports = Tier3Orchestrator;

// CLI
if (require.main === module) {
  const tier3 = new Tier3Orchestrator();
  tier3.initialize().then(() => {
    console.log('Tier 3 is running');
    
    // Keep alive
    setInterval(() => {}, 60000);
  });
}
