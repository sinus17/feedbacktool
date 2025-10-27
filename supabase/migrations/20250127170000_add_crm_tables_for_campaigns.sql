-- Migration to add CRM tables for campaign submissions
-- This allows the feedback tool to handle the entire campaign submission process

-- ============================================================================
-- 1. EXTEND ARTISTS TABLE
-- ============================================================================
-- Add missing columns to match reporting database
ALTER TABLE public.artists 
  ADD COLUMN IF NOT EXISTS customer_id UUID,
  ADD COLUMN IF NOT EXISTS spotify_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT;

-- Add index for customer_id
CREATE INDEX IF NOT EXISTS idx_artists_customer_id ON public.artists(customer_id);

-- ============================================================================
-- 2. CREATE CUSTOMERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('company', 'individual')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_type ON public.customers(type);

-- ============================================================================
-- 3. CREATE CONTACTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    street TEXT,
    zip TEXT,
    city TEXT,
    country TEXT,
    whatsapp_group_link TEXT,
    whatsapp_group_id TEXT,
    notion_dashboard_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contacts_customer_id ON public.contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(phone);

-- ============================================================================
-- 4. CREATE ARTIST_CONTACTS JUNCTION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.artist_contacts (
    artist_id TEXT NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    PRIMARY KEY (artist_id, contact_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_artist_contacts_artist_id ON public.artist_contacts(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_contacts_contact_id ON public.artist_contacts(contact_id);

-- ============================================================================
-- 5. CREATE RELEASES TABLE (simplified for feedback tool)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.releases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    artist_id TEXT REFERENCES public.artists(id) ON DELETE SET NULL,
    customer_id TEXT,
    
    -- Release details
    release_date DATE,
    spotify_uri TEXT,
    cover_link TEXT,
    master_file_link TEXT,
    
    -- Campaign details
    budget NUMERIC(12,2),
    currency TEXT DEFAULT 'EUR',
    status TEXT DEFAULT 'active',
    
    -- Links
    notion_link TEXT,
    content_board_link TEXT,
    dropbox_link TEXT,
    facebook_page_url TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_releases_artist_id ON public.releases(artist_id);
CREATE INDEX IF NOT EXISTS idx_releases_customer_id ON public.releases(customer_id);
CREATE INDEX IF NOT EXISTS idx_releases_release_date ON public.releases(release_date);
CREATE INDEX IF NOT EXISTS idx_releases_status ON public.releases(status);
CREATE INDEX IF NOT EXISTS idx_releases_user_id ON public.releases(user_id);

-- ============================================================================
-- 6. CREATE RELEASE_SUBMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.release_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Artist/Contact Information
    kuenstlername VARCHAR(255) NOT NULL,
    vorname VARCHAR(255) NOT NULL,
    nachname VARCHAR(255) NOT NULL,
    firma VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    telefon VARCHAR(50) NOT NULL,
    
    -- Address Information
    strasse VARCHAR(255) NOT NULL,
    plz VARCHAR(20) NOT NULL,
    ort VARCHAR(255) NOT NULL,
    land VARCHAR(255) NOT NULL,
    
    -- Release Information
    release_name VARCHAR(255) NOT NULL,
    release_date DATE NOT NULL,
    master_datei_link TEXT,
    cover_link TEXT,
    spotify_uri TEXT,
    facebook_page_url TEXT,
    content_ordner TEXT,
    
    -- Budget & Services
    werbebudget_netto INTEGER NOT NULL CHECK (werbebudget_netto >= 65000),
    content_strategy_upsell BOOLEAN DEFAULT false,
    voucher_promocode VARCHAR(100),
    
    -- Customer Status
    ist_neukunde BOOLEAN NOT NULL DEFAULT false,
    
    -- Processing Status
    status VARCHAR(50) DEFAULT 'neu',
    bearbeitet_von VARCHAR(255),
    bearbeitet_am TIMESTAMP WITH TIME ZONE,
    notizen TEXT,
    
    -- Relations
    campaign_id UUID REFERENCES public.releases(id) ON DELETE SET NULL,
    artist_id TEXT REFERENCES public.artists(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_release_submissions_status ON public.release_submissions(status);
CREATE INDEX IF NOT EXISTS idx_release_submissions_created_at ON public.release_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_release_submissions_campaign_id ON public.release_submissions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_release_submissions_artist_id ON public.release_submissions(artist_id);
CREATE INDEX IF NOT EXISTS idx_release_submissions_email ON public.release_submissions(email);

-- ============================================================================
-- 7. ADD FOREIGN KEY TO ARTISTS TABLE
-- ============================================================================
ALTER TABLE public.artists 
  ADD CONSTRAINT artists_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

-- ============================================================================
-- 8. CREATE UPDATED_AT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_releases_updated_at
    BEFORE UPDATE ON public.releases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. ENABLE RLS (Row Level Security)
-- ============================================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_submissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. CREATE RLS POLICIES (Public access for now, can be restricted later)
-- ============================================================================

-- Customers policies
CREATE POLICY "Enable read access for all users" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.customers FOR UPDATE USING (true);

-- Contacts policies
CREATE POLICY "Enable read access for all users" ON public.contacts FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.contacts FOR UPDATE USING (true);

-- Artist_contacts policies
CREATE POLICY "Enable read access for all users" ON public.artist_contacts FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.artist_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete for authenticated users" ON public.artist_contacts FOR DELETE USING (true);

-- Releases policies
CREATE POLICY "Enable read access for all users" ON public.releases FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.releases FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.releases FOR UPDATE USING (true);

-- Release_submissions policies
CREATE POLICY "Enable read access for all users" ON public.release_submissions FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.release_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.release_submissions FOR UPDATE USING (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.customers IS 'Customer/company information for CRM';
COMMENT ON TABLE public.contacts IS 'Contact persons associated with customers';
COMMENT ON TABLE public.artist_contacts IS 'Junction table linking artists to their contacts';
COMMENT ON TABLE public.releases IS 'Release/campaign information';
COMMENT ON TABLE public.release_submissions IS 'Campaign submissions from the public form';
