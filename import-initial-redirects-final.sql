-- Import initial swipe.fm redirects
-- These are the existing redirects from Cloudflare that need to be migrated

INSERT INTO public.short_urls (short_code, destination_url, title, description, created_by, is_active) VALUES
('campaign', 'https://wkf.ms/3QH2ORQ', 'Campaign Link', 'Main campaign redirect', 'c66102d4-e5b5-4fe9-9021-bb7cbaa2e734', true),
('access', 'https://swipeup-marketing.notion.site/Account-Freigaben-5663e8da87f34a39ab2b5957d61b301c?source=copy_link', 'Account Access (DE)', 'Account access documentation in German', 'c66102d4-e5b5-4fe9-9021-bb7cbaa2e734', true),
('zoom', 'https://us06web.zoom.us/j/3203597972', 'Zoom Meeting', 'Team Zoom meeting room', 'c66102d4-e5b5-4fe9-9021-bb7cbaa2e734', true),
('stats', 'https://www.notion.so/swipeup-marketing/Instagram-TikTok-Account-Stats-1b55bcd5930f8076bcfce4a80d364ab5?source=copy_link', 'Account Stats (DE)', 'Instagram & TikTok statistics in German', 'c66102d4-e5b5-4fe9-9021-bb7cbaa2e734', true),
('stats-en', 'https://www.notion.so/swipeup-marketing/Instagram-TikTok-Account-Stats-1d75bcd5930f805a94d4db3ee348fdc6?source=copy_link', 'Account Stats (EN)', 'Instagram & TikTok statistics in English', 'c66102d4-e5b5-4fe9-9021-bb7cbaa2e734', true),
('access-en', 'https://www.notion.so/swipeup-marketing/Account-Freigaben-984f4004329e45b2bceeee841c0ab6c0?source=copy_link', 'Account Access (EN)', 'Account access documentation in English', 'c66102d4-e5b5-4fe9-9021-bb7cbaa2e734', true),
('benchmarks', 'https://swipeup-marketing.notion.site/KPIs-Benchmarks-0bfbe49b0995411daf87daa63c47e099?source=copy_link', 'KPIs & Benchmarks (DE)', 'KPI benchmarks in German', 'c66102d4-e5b5-4fe9-9021-bb7cbaa2e734', true),
('benchmarks-en', 'https://swipeup-marketing.notion.site/KPIs-Benchmarks-19f5bcd5930f808e986dc3fddbc91e67?source=copy_link', 'KPIs & Benchmarks (EN)', 'KPI benchmarks in English', 'c66102d4-e5b5-4fe9-9021-bb7cbaa2e734', true),
('spotify-uri', 'https://swipeup-marketing.notion.site/Album-URI-vor-Release-auf-Spotify-finden-0e8d259b89bd4230810f9b09d557a554?source=copy_link', 'Spotify URI Guide', 'How to find Spotify album URI before release', 'c66102d4-e5b5-4fe9-9021-bb7cbaa2e734', true),
('auth', 'https://www.notion.so/swipeup-marketing/TikTok-AUTH-Code-generieren-1625bcd5930f8044b326dfd63be695fd?source=copy_link', 'TikTok AUTH Code', 'Guide to generate TikTok AUTH code', 'c66102d4-e5b5-4fe9-9021-bb7cbaa2e734', true)
ON CONFLICT (short_code) DO UPDATE SET
    destination_url = EXCLUDED.destination_url,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Verify the imports
SELECT 
    short_code, 
    destination_url, 
    title, 
    is_active,
    created_at
FROM public.short_urls 
WHERE short_code IN ('campaign', 'access', 'zoom', 'stats', 'stats-en', 'access-en', 'benchmarks', 'benchmarks-en', 'spotify-uri', 'auth')
ORDER BY short_code;
