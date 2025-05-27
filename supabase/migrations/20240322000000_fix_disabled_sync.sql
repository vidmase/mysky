-- First, ensure profiles table has correct disabled column
ALTER TABLE profiles ALTER COLUMN disabled SET DEFAULT false;

-- Reset any null values to false
UPDATE profiles SET disabled = false WHERE disabled IS NULL;

-- Reset any disabled flags in auth.users metadata
UPDATE auth.users u
SET raw_user_meta_data = raw_user_meta_data - 'disabled'
WHERE raw_user_meta_data->>'disabled' = 'true';

-- Create a more robust sync function
CREATE OR REPLACE FUNCTION sync_user_disabled_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.disabled IS DISTINCT FROM OLD.disabled THEN
        -- Update auth.users disabled status
        UPDATE auth.users
        SET raw_user_meta_data = 
            CASE 
                WHEN NEW.disabled = true THEN 
                    jsonb_set(
                        COALESCE(raw_user_meta_data, '{}'::jsonb),
                        '{disabled}',
                        'true'::jsonb
                    )
                ELSE 
                    raw_user_meta_data - 'disabled'
            END
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_disabled_status ON profiles;

-- Create new trigger
CREATE TRIGGER sync_disabled_status
    AFTER UPDATE OF disabled ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_disabled_status();

-- Update admin_toggle_user_status function to be more robust
CREATE OR REPLACE FUNCTION admin_toggle_user_status(
    target_user_id uuid,
    new_disabled_status boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_role text;
    result json;
BEGIN
    -- Check if the executing user is an admin
    SELECT role INTO admin_role
    FROM profiles
    WHERE id = auth.uid();
    
    IF admin_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can toggle user status';
    END IF;

    -- Update profiles table
    UPDATE profiles
    SET 
        disabled = new_disabled_status,
        updated_at = now()
    WHERE id = target_user_id
    RETURNING json_build_object(
        'id', id,
        'disabled', disabled,
        'updated_at', updated_at
    ) INTO result;

    -- Log the status change
    INSERT INTO user_activity (user_id, activity_type, details)
    VALUES (
        target_user_id,
        CASE WHEN new_disabled_status THEN 'account_disabled' ELSE 'account_enabled' END,
        jsonb_build_object(
            'changed_by', auth.uid(),
            'new_status', new_disabled_status
        )
    );

    RETURN result;
END;
$$; 