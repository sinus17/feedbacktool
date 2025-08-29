-- Add 'message_deleted' to the type check constraint
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
    'api_request',
    'message_deleted'
  ));