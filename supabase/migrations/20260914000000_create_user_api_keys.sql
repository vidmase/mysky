-- Per-user provider API keys, encrypted at rest.
--
-- The ciphertext is AES-256-GCM, produced by lib/secret-box.ts with a key
-- derived from API_KEY_ENCRYPTION_SECRET. The database never sees the
-- plaintext, so a dump of this table is worthless without that env secret.
--
-- RLS is enabled with NO policies on purpose: the anon key ships in the
-- browser bundle, and nothing in the browser may ever read these rows. The app
-- reaches this table only through the service-role client
-- (lib/supabase-server.ts), which bypasses RLS.

CREATE TABLE IF NOT EXISTS user_api_keys (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider text NOT NULL CHECK (provider IN ('deepseek')),
    -- AES-256-GCM parts, base64. Split rather than concatenated so a future
    -- algorithm change is a migration, not a parsing guess.
    ciphertext text NOT NULL,
    iv text NOT NULL,
    auth_tag text NOT NULL,
    -- Last 4 characters of the plaintext key, so the UI can show which key is
    -- stored without ever decrypting it.
    hint text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    -- One key per provider per user; saving again replaces it.
    UNIQUE (user_id, provider)
);

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_provider
    ON user_api_keys(user_id, provider);

-- update_updated_at_column() is created by 20241220000000_create_chat_messages.sql
DROP TRIGGER IF EXISTS update_user_api_keys_updated_at ON user_api_keys;
CREATE TRIGGER update_user_api_keys_updated_at
    BEFORE UPDATE ON user_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
