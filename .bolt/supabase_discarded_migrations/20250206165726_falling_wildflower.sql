-- Drop existing unique constraint and index
ALTER TABLE public.ad_creatives DROP CONSTRAINT IF EXISTS ad_creatives_content_key;
DROP INDEX IF EXISTS idx_ad_creatives_content_lower;

-- Add case-sensitive unique constraint with collation
ALTER TABLE public.ad_creatives ADD CONSTRAINT ad_creatives_content_key UNIQUE (content COLLATE "C");

-- Create case-sensitive index for better performance
CREATE UNIQUE INDEX idx_ad_creatives_content ON public.ad_creatives(content COLLATE "C");

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';