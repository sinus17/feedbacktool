-- Create campaigns table for storing campaign submissions
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- References
  artist_id TEXT REFERENCES artists(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- User type
  user_type TEXT CHECK (user_type IN ('artist', 'manager')),
  
  -- Release information
  release_name TEXT NOT NULL,
  release_date DATE NOT NULL,
  release_published BOOLEAN DEFAULT FALSE,
  
  -- Spotify data (for published releases)
  spotify_track_url TEXT,
  spotify_uri TEXT,
  
  -- Files (for unpublished releases)
  master_file_link TEXT,
  cover_link TEXT,
  
  -- Budget & services
  ad_budget_net INTEGER NOT NULL CHECK (ad_budget_net >= 650),
  service_package TEXT CHECK (service_package IN ('basic', 'full')) DEFAULT 'basic',
  total_amount_net INTEGER NOT NULL,
  
  -- Voucher
  voucher_code TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'in_progress', 'completed', 'cancelled')),
  
  -- Metadata
  notes TEXT
);

-- Create indexes
CREATE INDEX idx_campaigns_artist_id ON campaigns(artist_id);
CREATE INDEX idx_campaigns_contact_id ON campaigns(contact_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at);

-- Add updated_at trigger
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for authenticated users" ON campaigns
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users" ON campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON campaigns
  FOR UPDATE
  TO authenticated
  USING (true);

-- Add comments
COMMENT ON TABLE campaigns IS 'Campaign submissions from the new campaign form';
COMMENT ON COLUMN campaigns.artist_id IS 'Reference to the artist';
COMMENT ON COLUMN campaigns.contact_id IS 'Reference to the contact person';
COMMENT ON COLUMN campaigns.release_published IS 'Whether the release is already published on Spotify';
COMMENT ON COLUMN campaigns.ad_budget_net IS 'Advertising budget in EUR (net), minimum 650';
COMMENT ON COLUMN campaigns.service_package IS 'Service package: basic (400€) or full (800€)';
COMMENT ON COLUMN campaigns.total_amount_net IS 'Total amount including service package and ad budget';
