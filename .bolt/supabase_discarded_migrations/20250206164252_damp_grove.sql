-- Drop existing unique constraint and index
ALTER TABLE public.ad_creatives DROP CONSTRAINT IF EXISTS ad_creatives_content_key;
DROP INDEX IF EXISTS idx_ad_creatives_content_lower;

-- Add case-sensitive unique constraint
ALTER TABLE public.ad_creatives ADD CONSTRAINT ad_creatives_content_key UNIQUE (content);

-- Create case-sensitive index for better performance
CREATE UNIQUE INDEX idx_ad_creatives_content ON public.ad_creatives(content);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';