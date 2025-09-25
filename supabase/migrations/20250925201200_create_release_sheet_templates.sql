-- Create release_sheet_templates table for managing reusable templates
CREATE TABLE IF NOT EXISTS public.release_sheet_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Template information
    name TEXT NOT NULL,
    description TEXT,
    language TEXT DEFAULT 'en', -- Language code (en, de, etc.)
    
    -- Template content (same structure as release_sheets)
    content JSONB DEFAULT '{"blocks": []}'::jsonb,
    
    -- Template metadata
    tags TEXT[] DEFAULT '{}',
    cover_image_url TEXT,
    
    -- Template status
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false, -- Whether template is available to all users
    
    -- Creator information
    created_by_artist_id TEXT REFERENCES public.artists(id) ON DELETE SET NULL,
    
    -- Usage statistics
    usage_count INTEGER DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_release_sheet_templates_language ON public.release_sheet_templates(language);
CREATE INDEX IF NOT EXISTS idx_release_sheet_templates_is_active ON public.release_sheet_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_release_sheet_templates_is_public ON public.release_sheet_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_release_sheet_templates_created_by ON public.release_sheet_templates(created_by_artist_id);
CREATE INDEX IF NOT EXISTS idx_release_sheet_templates_created_at ON public.release_sheet_templates(created_at);

-- Create updated_at trigger
CREATE TRIGGER update_release_sheet_templates_updated_at 
    BEFORE UPDATE ON public.release_sheet_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE public.release_sheet_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON public.release_sheet_templates
    FOR SELECT USING (is_public = true OR created_by_artist_id = current_setting('app.current_artist_id', true));

CREATE POLICY "Enable insert for authenticated users" ON public.release_sheet_templates
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for template creators" ON public.release_sheet_templates
    FOR UPDATE USING (created_by_artist_id = current_setting('app.current_artist_id', true));

CREATE POLICY "Enable delete for template creators" ON public.release_sheet_templates
    FOR DELETE USING (created_by_artist_id = current_setting('app.current_artist_id', true));

-- Insert the German template based on the current release sheet
-- This will be populated via the application
