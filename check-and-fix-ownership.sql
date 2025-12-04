-- Check current ownership of short URLs
SELECT 
    s.short_code,
    s.title,
    s.created_by,
    u.email as owner_email
FROM public.short_urls s
LEFT JOIN auth.users u ON s.created_by = u.id
ORDER BY s.short_code;

-- If you need to reassign all links to a different user, uncomment and run:
-- UPDATE public.short_urls 
-- SET created_by = 'YOUR_USER_ID_HERE'
-- WHERE created_by = 'c66102d4-e5b5-4fe9-9021-bb7cbaa2e734';
