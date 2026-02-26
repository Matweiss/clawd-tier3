// logger.js - Tier 3: Centralized logging system
// Track all agent activity in one place

const { createClient } = require('@supabase/supabase-js');

class ClawdLogger {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.localBuffer = [];
  }

  async log(event) {
    const entry = {
      timestamp: new Date(),
      agent: event.agent || 'system',
      action: event.action,
      status: event.status || 'info',
      details: event.details || {},
      duration_ms: event.duration,
      error: event.error || null
    };

    // Buffer locally
    this.localBuffer.push(entry);
    
    // Flush to Supabase every 10 entries or on error
    if (this.localBuffer.length >= 10 || event.status === 'error') {
      await this.flush();
    }
  }

  async flush() {
    if (this.localBuffer.length === 0) return;
    
    const { error } = await this.supabase
      .from('clawd_logs')
      .insert(this.localBuffer);
    
    if (error) {
      console.error('[LOGGER] Failed to flush:', error.message);
      // Keep buffer for retry
    } else {
      this.localBuffer = [];
    }
  }

  // Agent-specific logging
  async agentStart(agentName, task) {
    await this.log({
      agent: agentName,
      action: 'start',
      status: 'info',
      details: { task }
    });
  }

  async agentComplete(agentName, task, duration) {
    await this.log({
      agent: agentName,
      action: 'complete',
      status: 'success',
      duration,
      details: { task }
    });
  }

  async agentError(agentName, task, error) {
    await this.log({
      agent: agentName,
      action: 'error',
      status: 'error',
      details: { task },
      error: error.message
    });
  }

  // API call logging
  async apiCall(service, endpoint, success, duration, error = null) {
    await this.log({
      agent: 'api',
      action: `${service}.${endpoint}`,
      status: success ? 'success' : 'error',
      duration,
      error: error?.message
    });
  }

  // Get recent activity
  async getRecent(hours = 24) {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    
    const { data, error } = await this.supabase
      .from('clawd_logs')
      .select('*')
      .gte('timestamp', cutoff.toISOString())
      .order('timestamp', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    return data || [];
  }

  // Get errors only
  async getErrors(hours = 24) {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    
    const { data, error } = await this.supabase
      .from('clawd_logs')
      .select('*')
      .eq('status', 'error')
      .gte('timestamp', cutoff.toISOString())
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // Get agent stats
  async getAgentStats(agentName, hours = 24) {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    
    const { data, error } = await this.supabase
      .from('clawd_logs')
      .select('*')
      .eq('agent', agentName)
      .gte('timestamp', cutoff.toISOString());
    
    if (error) throw error;
    
    const stats = {
      total: data.length,
      success: data.filter(d => d.status === 'success').length,
      error: data.filter(d => d.status === 'error').length,
      avgDuration: data.reduce((a, b) => a + (b.duration_ms || 0), 0) / data.length
    };
    
    return stats;
  }
}

module.exports = ClawdLogger;
