// cost-tracker.js - Tier 3: Monitor API costs
// Track spending across all services

const { createClient } = require('@supabase/supabase-js');

class CostTracker {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Cost per request (approximate)
    this.pricing = {
      'openai_gpt4': { per_1k_tokens: 0.03, type: 'token' },
      'openai_gpt35': { per_1k_tokens: 0.002, type: 'token' },
      'perplexity': { per_1k_requests: 0.20, type: 'request' },
      'elevenlabs': { per_1k_chars: 0.30, type: 'char' },
      'hubspot': { per_month: 0, type: 'free' },
      'avoma': { per_month: 0, type: 'free' }, // Included in plan
      'searxng': { per_month: 0, type: 'free' },
      'supabase': { per_month: 0, type: 'free' } // Within limits
    };
  }

  async track(service, usage, details = {}) {
    const cost = this.calculateCost(service, usage);
    
    const entry = {
      timestamp: new Date(),
      service,
      usage,
      cost_usd: cost,
      details,
      day: new Date().toISOString().split('T')[0],
      month: new Date().toISOString().slice(0, 7)
    };

    const { error } = await this.supabase
      .from('clawd_costs')
      .insert(entry);
    
    if (error) {
      console.error('[COST] Failed to track:', error.message);
    }

    // Check if approaching limits
    await this.checkBudget(service);
  }

  calculateCost(service, usage) {
    const pricing = this.pricing[service];
    if (!pricing) return 0;
    
    if (pricing.type === 'token') {
      return (usage / 1000) * pricing.per_1k_tokens;
    }
    if (pricing.type === 'request') {
      return (usage / 1000) * pricing.per_1k_requests;
    }
    if (pricing.type === 'char') {
      return (usage / 1000) * pricing.per_1k_chars;
    }
    return 0;
  }

  async checkBudget(service) {
    const daily = await this.getDailyCost(service);
    const monthly = await this.getMonthlyCost(service);
    
    const limits = {
      'openai_gpt4': { daily: 5, monthly: 50 },
      'perplexity': { daily: 2, monthly: 20 },
      'elevenlabs': { daily: 3, monthly: 30 }
    };

    const limit = limits[service];
    if (!limit) return;

    if (daily > limit.daily) {
      await this.alertBudget(service, 'daily', daily, limit.daily);
    }
    if (monthly > limit.monthly) {
      await this.alertBudget(service, 'monthly', monthly, limit.monthly);
    }
  }

  async alertBudget(service, period, current, limit) {
    const notifier = require('./smart-notifications.js');
    await notifier.send({
      type: 'budget_alert',
      priority: 'high',
      content: `⚠️ Budget alert: ${service} ${period} spend $${current.toFixed(2)} / $${limit}`
    });
  }

  async getDailyCost(service) {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await this.supabase
      .from('clawd_costs')
      .select('cost_usd')
      .eq('service', service)
      .eq('day', today);
    
    if (error || !data) return 0;
    return data.reduce((sum, d) => sum + d.cost_usd, 0);
  }

  async getMonthlyCost(service) {
    const month = new Date().toISOString().slice(0, 7);
    
    const { data, error } = await this.supabase
      .from('clawd_costs')
      .select('cost_usd')
      .eq('service', service)
      .eq('month', month);
    
    if (error || !data) return 0;
    return data.reduce((sum, d) => sum + d.cost_usd, 0);
  }

  async getTotalCosts(days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const { data, error } = await this.supabase
      .from('clawd_costs')
      .select('service, cost_usd')
      .gte('timestamp', cutoff.toISOString());
    
    if (error || !data) return {};
    
    const totals = {};
    for (const entry of data) {
      totals[entry.service] = (totals[entry.service] || 0) + entry.cost_usd;
    }
    
    return totals;
  }

  async getReport() {
    const daily = await this.getTotalCosts(1);
    const weekly = await this.getTotalCosts(7);
    const monthly = await this.getTotalCosts(30);
    
    return {
      daily,
      weekly,
      monthly,
      total_monthly: Object.values(monthly).reduce((a, b) => a + b, 0)
    };
  }
}

module.exports = CostTracker;

// Usage:
// const costs = new CostTracker();
// await costs.track('openai_gpt4', 1500, { model: 'gpt-4', task: 'summary' });
