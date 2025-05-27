-- First, sync any existing disabled statuses
UPDATE auth.users u
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{disabled}',
    to_jsonb(p.disabled)
)
FROM profiles p
WHERE u.id = p.id AND (p.disabled = true OR u.raw_user_meta_data->>'disabled' = 'true');

-- Create function to update auth.users disabled status
CREATE OR REPLACE FUNCTION sync_user_disabled_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update auth.users disabled status
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{disabled}',
        to_jsonb(NEW.disabled)
    )
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$;

-- Create trigger to sync disabled status
DROP TRIGGER IF EXISTS sync_disabled_status ON profiles;
CREATE TRIGGER sync_disabled_status
    AFTER UPDATE OF disabled ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_disabled_status();

-- Update admin_toggle_user_status function to handle both tables
CREATE OR REPLACE FUNCTION admin_toggle_user_status(
    target_user_id uuid,
    new_disabled_status boolean,
    deactivation_end_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_role text;
    target_user_role text;
    result json;
BEGIN
    -- Check if the executing user is an admin
    SELECT role INTO admin_role
    FROM profiles
    WHERE id = auth.uid();
    
    IF admin_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can toggle user status';
    END IF;

    -- Check if target user exists and get their role
    SELECT role INTO target_user_role
    FROM profiles
    WHERE id = target_user_id;
    
    IF target_user_role IS NULL THEN
        RAISE EXCEPTION 'Target user not found';
    END IF;

    -- Update profiles table
    UPDATE profiles
    SET 
        disabled = new_disabled_status,
        deactivation_end_date = CASE 
            WHEN new_disabled_status = false THEN NULL 
            ELSE deactivation_end_date
        END,
        updated_at = now()
    WHERE id = target_user_id
    RETURNING json_build_object(
        'id', id,
        'disabled', disabled,
        'deactivation_end_date', deactivation_end_date
    ) INTO result;

    -- The trigger will handle updating auth.users table
    
    RETURN result;
END;
$$; 