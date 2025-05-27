-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('email', 'direct')),
    subject text NOT NULL,
    message text NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add RLS policies for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own messages"
    ON messages FOR SELECT
    USING (auth.uid() = recipient_id);

CREATE POLICY "Admins can read all messages"
    ON messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ));

CREATE POLICY "Admins can send messages"
    ON messages FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ));

-- Create function for sending messages
CREATE OR REPLACE FUNCTION admin_send_user_message(
    target_user_id uuid,
    message_type text,
    message_subject text,
    message_content text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    sender_role text;
    user_email text;
BEGIN
    -- Check if sender is admin
    SELECT role INTO sender_role
    FROM profiles
    WHERE id = auth.uid();
    
    IF sender_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can send messages';
    END IF;

    -- Insert the message
    INSERT INTO messages (
        sender_id,
        recipient_id,
        type,
        subject,
        message
    ) VALUES (
        auth.uid(),
        target_user_id,
        message_type,
        message_subject,
        message_content
    );

    -- If it's an email, send it through Supabase Edge Function
    IF message_type = 'email' THEN
        -- Get user's email
        SELECT email INTO user_email
        FROM auth.users
        WHERE id = target_user_id;

        -- Trigger email sending through Edge Function
        PERFORM net.http_post(
            url := 'https://' || current_setting('custom.supabase_project_ref') || '.functions.supabase.co/send-email',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('custom.supabase_anon_key')
            ),
            body := jsonb_build_object(
                'to', user_email,
                'subject', message_subject,
                'content', message_content
            )::text
        );
    END IF;
END;
$$; 