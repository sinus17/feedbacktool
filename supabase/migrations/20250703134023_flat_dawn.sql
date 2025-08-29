/*
  # Remove WhatsApp Invite URL from artists table
  
  1. Changes
    - Remove whatsapp_invite_url column from artists table
    - Ensure data integrity by preserving all other columns
  
  2. Security
    - No changes to RLS policies needed
*/

-- Remove whatsapp_invite_url column from artists table
ALTER TABLE public.artists
  DROP COLUMN IF EXISTS whatsapp_invite_url;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';