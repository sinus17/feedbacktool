/*
  # Update whatsapp_logs type constraint
  
  1. Changes
    - Add 'api_request' to the allowed types in whatsapp_logs
    - Add 'whatsapp_message' to the allowed types in whatsapp_logs
    - Add 'notification' to the allowed types in whatsapp_logs
    - Add 'submission' to the allowed types in whatsapp_logs
  
  2. Security
    - No changes to RLS policies needed
*/

-- Update the type check constraint for whatsapp_logs
ALTER TABLE public.whatsapp_logs 
  DROP CONSTRAINT IF EXISTS whatsapp_logs_type_check;

ALTER TABLE public.whatsapp_logs
  ADD CONSTRAINT whatsapp_logs_type_check 
  CHECK (type IN (
    'feedback', 
    'video_deleted', 
    'video_renamed', 
    'type_changed', 
    'group_description', 
    'feedback_reminder', 
    'correction_reminder', 
    'group_access', 
    'message_deleted', 
    'ad_creative_submission',
    'submission',
    'notification',
    'whatsapp_message',
    'api_request'
  ));

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';