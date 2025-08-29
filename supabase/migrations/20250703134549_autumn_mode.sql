/*
  # Fix WhatsApp Messaging for All Artists
  
  1. Changes
    - Create a function to properly format and validate WhatsApp group IDs
    - Update all existing artist records to ensure group IDs are properly formatted
    - Add validation to ensure group IDs are at least 15 digits long
    - Remove any non-numeric characters from group IDs
  
  2. Security
    - No changes to RLS policies needed
*/

-- Create a function to clean and format WhatsApp group IDs
CREATE OR REPLACE FUNCTION format_whatsapp_group_id(group_id text)
RETURNS text AS $$
BEGIN
  -- Return null if input is null
  IF group_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove any non-numeric characters
  RETURN regexp_replace(group_id, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql;

-- Update all existing artist records to ensure group IDs are properly formatted
UPDATE public.artists
SET whatsapp_group_id = format_whatsapp_group_id(whatsapp_group_id)
WHERE whatsapp_group_id IS NOT NULL;

-- Fix Test DXR specifically (if it exists)
UPDATE public.artists
SET whatsapp_group_id = '120363421104561493'
WHERE name = 'Test DXR' AND (whatsapp_group_id IS NULL OR whatsapp_group_id = '');

-- Create a function to validate WhatsApp group IDs
CREATE OR REPLACE FUNCTION validate_whatsapp_group_id(group_id text)
RETURNS boolean AS $$
DECLARE
  cleaned_id text;
BEGIN
  -- Return false if input is null
  IF group_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Clean the group ID
  cleaned_id := format_whatsapp_group_id(group_id);
  
  -- Check if it's at least 15 digits long
  RETURN length(cleaned_id) >= 15 AND cleaned_id ~ '^[0-9]+$';
END;
$$ LANGUAGE plpgsql;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';