-- Tier 3 Database Schema Additions
-- Add these to your Supabase database

-- Centralized logging
CREATE TABLE IF NOT EXISTS clawd_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz DEFAULT now(),
  agent text NOT NULL,
  action text NOT NULL,
  status text DEFAULT 'info',
  details jsonb DEFAULT '{}',
  duration_ms int,
  error text,
  day text DEFAULT to_char(now(), 'YYYY-MM-DD'),
  month text DEFAULT to_char(now(), 'YYYY-MM')
);

CREATE INDEX idx_clawd_logs_timestamp ON clawd_logs(timestamp DESC);
CREATE INDEX idx_clawd_logs_agent ON clawd_logs(agent);
CREATE INDEX idx_clawd_logs_status ON clawd_logs(status);

-- Cost tracking
CREATE TABLE IF NOT EXISTS clawd_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz DEFAULT now(),
  service text NOT NULL,
  usage numeric,
  cost_usd numeric DEFAULT 0,
  details jsonb DEFAULT '{}',
  day text DEFAULT to_char(now(), 'YYYY-MM-DD'),
  month text DEFAULT to_char(now(), 'YYYY-MM')
);

CREATE INDEX idx_clawd_costs_service ON clawd_costs(service);
CREATE INDEX idx_clawd_costs_month ON clawd_costs(month);

-- Content drafts
CREATE TABLE IF NOT EXISTS content_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  subject text,
  body text NOT NULL,
  context jsonb DEFAULT '{}',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  notes text
);

CREATE INDEX idx_content_drafts_status ON content_drafts(status);
CREATE INDEX idx_content_drafts_created ON content_drafts(created_at DESC);

-- Error tracking
CREATE TABLE IF NOT EXISTS clawd_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz DEFAULT now(),
  operation text NOT NULL,
  error_message text,
  error_code text,
  retry_count int DEFAULT 0,
  resolved boolean DEFAULT false,
  day text DEFAULT to_char(now(), 'YYYY-MM-DD')
);

CREATE INDEX idx_clawd_errors_resolved ON clawd_errors(resolved);
CREATE INDEX idx_clawd_errors_day ON clawd_errors(day);

-- Notification history
CREATE TABLE IF NOT EXISTS notification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz DEFAULT now(),
  type text NOT NULL,
  notification_id text NOT NULL,
  priority text,
  content_preview text,
  sent boolean DEFAULT false,
  skip_reason text,
  day text DEFAULT to_char(now(), 'YYYY-MM-DD')
);

CREATE INDEX idx_notification_history_type ON notification_history(type);
CREATE INDEX idx_notification_history_day ON notification_history(day);

-- Add unique constraint for deduplication
CREATE UNIQUE INDEX idx_notification_unique 
ON notification_history(type, notification_id, day);
