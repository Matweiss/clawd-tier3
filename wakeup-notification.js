#!/usr/bin/env node
/**
 * Wake-up notification for Mat
 * Sends 3 improvements/skills when he wakes up
 */

const fetch = require('node-fetch');

async function sendWakeUpNotification() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!token || !chatId) {
    console.log('TELEGRAM not configured, would send wake-up notification');
    return;
  }

  const message = `🌅 Good morning Mat! 

Tier 3 is complete. Here are 3 improvements waiting for you:

1️⃣ SMART NOTIFICATIONS
   • No more spam — deduplication active
   • Quiet hours: 11 PM - 7 AM PT
   • Max 1 battle card per day (as requested)

2️⃣ ERROR HANDLER  
   • Auto-retry with exponential backoff
   • Circuit breaker (5 failures = 5 min cooldown)
   • Self-healing — agents recover automatically

3️⃣ CONTENT PIPELINE
   • Auto-draft follow-up emails
   • Proposal templates
   • All drafts queued for your approval (never auto-send)

Plus: Cost tracking, centralized logging, meeting intelligence

📊 Summary: https://github.com/Matweiss/clawd-brain-data/blob/main/BACKUP_HANDOFF.md

Ready when you are! 🦞`;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
    console.log('✅ Wake-up notification sent');
  } catch (err) {
    console.error('Failed to send:', err.message);
  }
}

sendWakeUpNotification();
