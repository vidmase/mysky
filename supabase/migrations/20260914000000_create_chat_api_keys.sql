-- Per-user chat provider API keys, encrypted at rest.
--
-- NB the name: `user_api_keys` is already taken in this database by n8n
-- (TypeORM-managed, FK to public.user), which shares the project. Hence the
-- chat_ prefix, in the same spirit as vidmaflights next to n8n's flights.
--
-- The ciphertext is AES-256-GCM, produced by lib/secret-box.ts with a key
-- derived from API_KEY_ENCRYPTION_SECRET. The database never sees the
-- plaintext, so a dump of this table is worthless without that env secret.
--
-- RLS is enabled with NO policies on purpose: the anon key ships in the
-- browser bundle, and nothing in the browser may ever read these rows. The app
-- reaches this table only through the service-role client
-- (lib/supabase-server.ts), which bypasses RLS.

CREATE TABLE IF NOT EXISTS chat_api_keys (
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

ALTER TABLE chat_api_keys ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chat_api_keys_user_provider
    ON chat_api_keys(user_id, provider);

-- Also created by 20241220000000_create_chat_messages.sql; re-asserted so this
-- migration can be applied on its own.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_chat_api_keys_updated_at ON chat_api_keys;
CREATE TRIGGER update_chat_api_keys_updated_at
    BEFORE UPDATE ON chat_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS already blocks the rows, but the default PostgREST grants still leave the
-- table (and its column names) discoverable in the GraphQL/REST schema to the
-- anon key that ships in the browser bundle. Nothing outside the service-role
-- client ever touches this table, so take the grants away entirely.
REVOKE ALL ON public.chat_api_keys FROM anon;
REVOKE ALL ON public.chat_api_keys FROM authenticated;
