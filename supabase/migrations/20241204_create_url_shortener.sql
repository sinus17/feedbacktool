-- Create URL shortener table
CREATE TABLE IF NOT EXISTS public.short_urls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  short_code VARCHAR(50) UNIQUE NOT NULL,
  destination_url TEXT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  click_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for fast lookups
CREATE INDEX idx_short_urls_short_code ON public.short_urls(short_code);
CREATE INDEX idx_short_urls_created_by ON public.short_urls(created_by);
CREATE INDEX idx_short_urls_is_active ON public.short_urls(is_active);

-- Create click tracking table
CREATE TABLE IF NOT EXISTS public.short_url_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  short_url_id UUID REFERENCES public.short_urls(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  ip_address INET,
  country VARCHAR(2),
  city VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for analytics
CREATE INDEX idx_short_url_clicks_short_url_id ON public.short_url_clicks(short_url_id);
CREATE INDEX idx_short_url_clicks_clicked_at ON public.short_url_clicks(clicked_at);

-- Enable Row Level Security
ALTER TABLE public.short_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.short_url_clicks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for short_urls
-- Allow anyone to read active short URLs (needed for redirects)
CREATE POLICY "Anyone can read active short URLs"
  ON public.short_urls
  FOR SELECT
  USING (is_active = true);

-- Allow authenticated users to create short URLs
CREATE POLICY "Authenticated users can create short URLs"
  ON public.short_urls
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to update their own short URLs
CREATE POLICY "Users can update their own short URLs"
  ON public.short_urls
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Allow users to delete their own short URLs
CREATE POLICY "Users can delete their own short URLs"
  ON public.short_urls
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for short_url_clicks
-- Allow anyone to insert click data (needed for tracking)
CREATE POLICY "Anyone can insert click data"
  ON public.short_url_clicks
  FOR INSERT
  WITH CHECK (true);

-- Allow users to view clicks for their own short URLs
CREATE POLICY "Users can view clicks for their own short URLs"
  ON public.short_url_clicks
  FOR SELECT
  TO authenticated
  USING (
    short_url_id IN (
      SELECT id FROM public.short_urls WHERE created_by = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_short_url_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_short_urls_updated_at
  BEFORE UPDATE ON public.short_urls
  FOR EACH ROW
  EXECUTE FUNCTION update_short_url_updated_at();

-- Function to increment click count
CREATE OR REPLACE FUNCTION increment_short_url_clicks()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.short_urls
  SET click_count = click_count + 1
  WHERE id = NEW.short_url_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment click count
CREATE TRIGGER increment_short_url_click_count
  AFTER INSERT ON public.short_url_clicks
  FOR EACH ROW
  EXECUTE FUNCTION increment_short_url_clicks();

-- Grant permissions
GRANT SELECT ON public.short_urls TO anon;
GRANT ALL ON public.short_urls TO authenticated;
GRANT INSERT ON public.short_url_clicks TO anon;
GRANT SELECT ON public.short_url_clicks TO authenticated;
