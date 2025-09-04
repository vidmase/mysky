-- Create Gmail import sessions table for enhanced reliability system
CREATE TABLE IF NOT EXISTS gmail_import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed', 'failed', 'cancelled')),
  current_phase TEXT DEFAULT 'search' CHECK (current_phase IN ('search', 'classify', 'parse', 'deduplicate', 'save', 'completed', 'failed')),
  
  -- Progress tracking
  total_emails INTEGER DEFAULT 0,
  processed_emails INTEGER DEFAULT 0,
  successfully_parsed INTEGER DEFAULT 0,
  duplicates_found INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  current_batch INTEGER DEFAULT 0,
  
  -- Phase completion tracking
  phase_search_complete BOOLEAN DEFAULT FALSE,
  phase_classify_complete BOOLEAN DEFAULT FALSE,
  phase_parse_complete BOOLEAN DEFAULT FALSE,
  phase_deduplicate_complete BOOLEAN DEFAULT FALSE,
  phase_save_complete BOOLEAN DEFAULT FALSE,
  
  -- Performance metrics
  processing_rate DECIMAL(10,2) DEFAULT 0,
  estimated_time_remaining INTEGER, -- seconds
  
  -- Configuration and metadata
  search_query TEXT,
  filter_config JSONB,
  import_options JSONB,
  
  -- Results and diagnostics
  error_details JSONB DEFAULT '[]'::jsonb,
  recovery_stats JSONB,
  checkpoint_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_gmail_import_sessions_user_id ON gmail_import_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_import_sessions_status ON gmail_import_sessions(status);
CREATE INDEX IF NOT EXISTS idx_gmail_import_sessions_created_at ON gmail_import_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_gmail_import_sessions_user_status ON gmail_import_sessions(user_id, status);

-- Enable RLS
ALTER TABLE gmail_import_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own import sessions" ON gmail_import_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own import sessions" ON gmail_import_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own import sessions" ON gmail_import_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own import sessions" ON gmail_import_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_gmail_import_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER trigger_update_gmail_import_sessions_updated_at
  BEFORE UPDATE ON gmail_import_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_gmail_import_sessions_updated_at();

-- Create function to automatically set completed_at when status changes to completed/failed/cancelled
CREATE OR REPLACE FUNCTION set_gmail_import_sessions_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'failed', 'cancelled') AND OLD.status NOT IN ('completed', 'failed', 'cancelled') THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic completion timestamp
CREATE TRIGGER trigger_set_gmail_import_sessions_completed_at
  BEFORE UPDATE ON gmail_import_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_gmail_import_sessions_completed_at();
