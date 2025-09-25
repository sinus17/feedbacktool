-- Create RPC function to insert release sheet templates
CREATE OR REPLACE FUNCTION insert_release_sheet_template(template_data JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.release_sheet_templates (
        name,
        description,
        language,
        content,
        created_by_artist_id,
        is_public,
        tags
    ) VALUES (
        (template_data->>'name')::TEXT,
        (template_data->>'description')::TEXT,
        (template_data->>'language')::TEXT,
        (template_data->'content')::JSONB,
        (template_data->>'created_by_artist_id')::TEXT,
        (template_data->>'is_public')::BOOLEAN,
        ARRAY(SELECT jsonb_array_elements_text(template_data->'tags'))
    );
END;
$$;

-- Create function to get templates for an artist
CREATE OR REPLACE FUNCTION get_release_sheet_templates(artist_id_param TEXT DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    name TEXT,
    description TEXT,
    language TEXT,
    content JSONB,
    tags TEXT[],
    cover_image_url TEXT,
    is_active BOOLEAN,
    is_public BOOLEAN,
    created_by_artist_id TEXT,
    usage_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.created_at,
        t.updated_at,
        t.name,
        t.description,
        t.language,
        t.content,
        t.tags,
        t.cover_image_url,
        t.is_active,
        t.is_public,
        t.created_by_artist_id,
        t.usage_count
    FROM public.release_sheet_templates t
    WHERE t.is_active = true
    AND (
        t.is_public = true 
        OR (artist_id_param IS NOT NULL AND t.created_by_artist_id = artist_id_param)
    )
    ORDER BY t.created_at DESC;
END;
$$;
