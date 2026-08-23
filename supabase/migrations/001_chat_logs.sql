-- Chat logs table for TripWise chatbot exchanges
CREATE TABLE IF NOT EXISTS chat_logs (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  mode        TEXT NOT NULL CHECK (mode IN ('online', 'offline')),
  language    TEXT NOT NULL CHECK (language IN ('en', 'fil')),
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
  boat_id     TEXT NOT NULL DEFAULT 'anonymous'
);

-- Index for querying by boat and time
CREATE INDEX IF NOT EXISTS idx_chat_logs_boat_time ON chat_logs (boat_id, timestamp DESC);

-- RLS: allow anonymous inserts from the frontend
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts" ON chat_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated reads" ON chat_logs
  FOR SELECT
  USING (auth.role() = 'authenticated');
