-- Create release_sheets table for managing artist release sheets
CREATE TABLE IF NOT EXISTS public.release_sheets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Basic sheet information
    title TEXT NOT NULL,
    artist_id TEXT NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
    
    -- Reference to release from reporting database
    release_id TEXT, -- This will reference the release ID from the reporting database
    release_title TEXT, -- Cached release title for performance
    
    -- Sheet content (Notion-style JSON structure)
    content JSONB DEFAULT '{"blocks": []}'::jsonb,
    
    -- Sheet status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    cover_image_url TEXT,
    
    -- Timestamps
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_release_sheets_artist_id ON public.release_sheets(artist_id);
CREATE INDEX IF NOT EXISTS idx_release_sheets_release_id ON public.release_sheets(release_id);
CREATE INDEX IF NOT EXISTS idx_release_sheets_status ON public.release_sheets(status);
CREATE INDEX IF NOT EXISTS idx_release_sheets_created_at ON public.release_sheets(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_release_sheets_updated_at 
    BEFORE UPDATE ON public.release_sheets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE public.release_sheets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON public.release_sheets
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.release_sheets
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.release_sheets
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.release_sheets
    FOR DELETE USING (true);
