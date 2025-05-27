-- Update admin_toggle_user_status function to handle RLS properly
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

    -- If we're enabling a user, ensure their auth.users metadata is cleaned up
    IF NOT new_disabled_status THEN
        UPDATE auth.users
        SET raw_user_meta_data = 
            CASE 
                WHEN raw_user_meta_data ? 'disabled' 
                THEN raw_user_meta_data - 'disabled'
                ELSE raw_user_meta_data
            END
        WHERE id = target_user_id;
    END IF;

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