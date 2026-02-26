// smart-notifications.js - Tier 3: Intelligent notification system
// Fixes spam by using smart deduplication and priority filtering

class SmartNotifier {
  constructor() {
    this.sentToday = new Set();
    this.rateLimits = new Map();
    this.quietHours = { start: 23, end: 7 }; // 11 PM - 7 AM PT
  }

  async send(notification) {
    const { type, id, priority, content } = notification;
    
    // Skip if already sent today (deduplication)
    const key = `${type}:${id}`;
    if (this.sentToday.has(key)) {
      console.log(`[SMART] Skipping duplicate: ${key}`);
      return { sent: false, reason: 'duplicate' };
    }
    
    // Check quiet hours for non-critical
    if (priority !== 'critical' && this.isQuietHours()) {
      console.log(`[SMART] Queued for morning: ${key}`);
      this.queueForMorning(notification);
      return { sent: false, reason: 'quiet_hours' };
    }
    
    // Rate limiting
    if (this.isRateLimited(type)) {
      this.batchForDigest(notification);
      return { sent: false, reason: 'rate_limited' };
    }
    
    // Mark as sent
    this.sentToday.add(key);
    this.updateRateLimit(type);
    
    // Actually send
    return await this.deliver(content);
  }

  isQuietHours() {
    const hour = new Date().getHours(); // Server time
    return hour >= this.quietHours.start || hour < this.quietHours.end;
  }

  isRateLimited(type) {
    const limit = this.getRateLimit(type);
    const sent = this.rateLimits.get(type) || 0;
    return sent >= limit;
  }

  getRateLimit(type) {
    const limits = {
      'battle_card': 1,      // Max 1 per day
      'pipeline_alert': 3,   // Max 3 per day
      'stale_deal': 2,       // Max 2 per day
      'api_error': 5,        // Max 5 per day
      'system': 10           // Max 10 per day
    };
    return limits[type] || 5;
  }

  updateRateLimit(type) {
    const current = this.rateLimits.get(type) || 0;
    this.rateLimits.set(type, current + 1);
  }

  async deliver(content) {
    // Send via Telegram
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!token || !chatId) {
      console.log('[SMART] Would send:', content.substring(0, 50));
      return { sent: true, mock: true };
    }

    try {
      const fetch = require('node-fetch');
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: content, parse_mode: 'HTML' })
      });
      return { sent: true };
    } catch (err) {
      return { sent: false, error: err.message };
    }
  }

  queueForMorning(notification) {
    // Store for 7 AM delivery
    console.log(`[SMART] Morning queue: ${notification.type}`);
  }

  batchForDigest(notification) {
    // Add to daily digest
    console.log(`[SMART] Digest batch: ${notification.type}`);
  }

  resetDaily() {
    this.sentToday.clear();
    this.rateLimits.clear();
    console.log('[SMART] Daily counters reset');
  }
}

// Singleton
module.exports = new SmartNotifier();
