-- Create table to cache WhatsApp group members for fast lookup
CREATE TABLE IF NOT EXISTS public.artist_whatsapp_group_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Artist reference
    artist_id TEXT REFERENCES public.artists(id) ON DELETE CASCADE,
    
    -- Group information
    whatsapp_group_id TEXT NOT NULL,
    whatsapp_group_name TEXT,
    
    -- Member information
    member_phone TEXT NOT NULL, -- Phone number without @ suffix
    member_rank TEXT, -- 'creator', 'admin', 'member'
    
    -- Cache metadata
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    sync_status TEXT DEFAULT 'success', -- 'success', 'failed', 'pending'
    sync_error TEXT,
    
    -- Unique constraint: one entry per artist-member combination
    UNIQUE(artist_id, member_phone)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_members_artist_id ON public.artist_whatsapp_group_members(artist_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_members_phone ON public.artist_whatsapp_group_members(member_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_members_group_id ON public.artist_whatsapp_group_members(whatsapp_group_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_members_last_synced ON public.artist_whatsapp_group_members(last_synced_at);

-- Create updated_at trigger
CREATE TRIGGER update_artist_whatsapp_group_members_updated_at 
    BEFORE UPDATE ON public.artist_whatsapp_group_members 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.artist_whatsapp_group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users" ON public.artist_whatsapp_group_members
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.artist_whatsapp_group_members
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.artist_whatsapp_group_members
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.artist_whatsapp_group_members
    FOR DELETE USING (true);

-- Function to clean up old/stale cache entries (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_stale_whatsapp_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM public.artist_whatsapp_group_members
    WHERE last_synced_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Comment on table
COMMENT ON TABLE public.artist_whatsapp_group_members IS 'Cache table for WhatsApp group members to speed up artist lookup by phone number';
