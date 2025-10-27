-- Add locked_nodes field to release_sheet_templates table
-- This will store an array of node positions that are locked in the template

ALTER TABLE release_sheet_templates 
ADD COLUMN IF NOT EXISTS locked_nodes JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN release_sheet_templates.locked_nodes IS 'Array of locked node positions in the template content';
