# Clawd Tier 3 — Advanced Intelligence

Smart notifications, self-healing, logging, cost tracking, and content generation.

## Features

| Feature | File | Description |
|---------|------|-------------|
| **Smart Notifications** | `smart-notifications.js` | No spam, deduplication, quiet hours |
| **Error Handler** | `error-handler.js` | Auto-retry, circuit breaker, self-healing |
| **Logger** | `logger.js` | Centralized activity tracking |
| **Cost Tracker** | `cost-tracker.js` | API spend monitoring |
| **Content Pipeline** | `content-pipeline.js` | Auto-draft emails, proposals |
| **Orchestrator** | `index.js` | Ties everything together |

## Quick Start

```bash
cd /root/.openclaw/workspace/clawd-tier3
npm install
```

### 1. Setup Database

Run `tier3-schema.sql` in Supabase SQL Editor.

### 2. Environment Variables

```bash
export SUPABASE_URL="your-url"
export SUPABASE_SERVICE_ROLE_KEY="your-key"
export TELEGRAM_BOT_TOKEN="your-token"
export TELEGRAM_CHAT_ID="your-chat-id"
```

### 3. Test

```bash
node index.js
```

## Usage

### Smart Notifications

```javascript
const Tier3 = require('./index.js');
const tier3 = new Tier3Orchestrator();

// Won't spam - deduplicated
await tier3.notify({
  type: 'battle_card',
  id: 'meeting-123',
  priority: 'high',
  content: 'Battle card for Broken Yolk'
});

// Skipped if already sent today
```

### Error Handling

```javascript
const result = await tier3.execute(
  () => fetchHubSpotDeals(),
  { name: 'hubspot_fetch', maxRetries: 3 }
);
// Auto-retries with exponential backoff
```

### Cost Tracking

```javascript
await tier3.trackCost('openai_gpt4', 1500, { task: 'summary' });
// Alerts if approaching budget limits
```

### Content Generation

```javascript
const draft = await tier3.generateContent('followUp', {
  company: 'Broken Yolk',
  contact: { name: 'Dimitra' },
  lastMeeting: { date: '2026-02-26' }
});
// Queued for Mat's approval
```

## Smart Features

### Notification Deduplication
- Max 1 battle card per day
- Max 3 pipeline alerts per day
- Quiet hours: 11 PM - 7 AM PT
- Duplicates auto-skipped (silently)

### Error Recovery
- Exponential backoff (1s, 2s, 4s)
- Circuit breaker (5 failures = 5 min cooldown)
- Auto-retry up to 3 times
- Permanent failures notify admin

### Budget Alerts
- Daily limits per service
- Monthly spending caps
- Alerts at 80% of limit
- Automatic cost calculation

### Content Suggestions
- Detects stale deals
- Post-meeting follow-ups
- Proposal reminders
- All drafts require approval

## Database Tables

| Table | Purpose |
|-------|---------|
| `clawd_logs` | Activity tracking |
| `clawd_costs` | API spend |
| `clawd_errors` | Error history |
| `content_drafts` | Pending content |
| `notification_history` | Deduplication |

---
*Part of Clawd Tier 3: Advanced Intelligence*
