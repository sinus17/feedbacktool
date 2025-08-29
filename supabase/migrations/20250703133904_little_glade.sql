/*
  # Fix WhatsApp Group Display
  
  1. Changes
    - Update the Artists table to ensure consistent display of WhatsApp information
    - Extract invite URLs from group IDs where appropriate
    - Ensure all artists have the correct format for their WhatsApp contact information
  
  2. Security
    - No changes to RLS policies needed
*/

-- Create a function to format WhatsApp group IDs and invite URLs
CREATE OR REPLACE FUNCTION format_whatsapp_info()
RETURNS void AS $$
DECLARE
  artist_record RECORD;
BEGIN
  -- Loop through all artists
  FOR artist_record IN SELECT id, whatsapp_group_id, whatsapp_invite_url FROM artists
  LOOP
    -- If artist has a group ID but no invite URL, create the invite URL
    IF artist_record.whatsapp_group_id IS NOT NULL AND artist_record.whatsapp_invite_url IS NULL THEN
      UPDATE artists
      SET whatsapp_invite_url = 'https://chat.whatsapp.com/' || artist_record.whatsapp_group_id
      WHERE id = artist_record.id;
    END IF;
    
    -- If artist has an invite URL but no group ID, try to extract the group ID
    IF artist_record.whatsapp_invite_url IS NOT NULL AND artist_record.whatsapp_group_id IS NULL THEN
      -- Extract the group ID from the invite URL if it matches the pattern
      IF artist_record.whatsapp_invite_url ~ 'https://chat.whatsapp.com/([A-Za-z0-9]+)' THEN
        UPDATE artists
        SET whatsapp_group_id = substring(artist_record.whatsapp_invite_url from 'https://chat.whatsapp.com/([A-Za-z0-9]+)')
        WHERE id = artist_record.id;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to fix WhatsApp information
SELECT format_whatsapp_info();

-- Drop the function after use
DROP FUNCTION format_whatsapp_info();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';