/*
  # Add WhatsApp invite URL to artists table
  
  1. Changes
    - Add whatsapp_invite_url column to artists table
    - This allows storing direct invite links for WhatsApp groups
  
  2. Security
    - No changes to RLS policies needed
    - Existing policies already cover the new column
*/

-- Add whatsapp_invite_url column to artists table
ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS whatsapp_invite_url text;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';