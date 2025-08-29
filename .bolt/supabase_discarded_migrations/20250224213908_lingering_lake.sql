-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_schema_info();

-- Create function to get schema information
CREATE OR REPLACE FUNCTION get_schema_info()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  schema_data json;
BEGIN
  -- Collect all schema information into a JSON object
  SELECT json_build_object(
    'timestamp', now(),
    'tables', (
      SELECT json_agg(json_build_object(
        'table_name', table_name,
        'columns', (
          SELECT json_agg(json_build_object(
            'column_name', column_name,
            'data_type', data_type,
            'is_nullable', is_nullable,
            'column_default', column_default
          ))
          FROM information_schema.columns c
          WHERE c.table_schema = 'public' 
          AND c.table_name = t.table_name
        )
      ))
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ),
    'policies', (
      SELECT json_agg(json_build_object(
        'schemaname', schemaname,
        'tablename', tablename,
        'policyname', policyname,
        'roles', roles,
        'cmd', cmd,
        'qual', qual,
        'with_check', with_check
      ))
      FROM pg_policies
      WHERE schemaname = 'public'
    ),
    'indexes', (
      SELECT json_agg(json_build_object(
        'schemaname', schemaname,
        'tablename', tablename,
        'indexname', indexname,
        'indexdef', indexdef
      ))
      FROM pg_indexes
      WHERE schemaname = 'public'
    ),
    'triggers', (
      SELECT json_agg(json_build_object(
        'trigger_name', trigger_name,
        'event_manipulation', event_manipulation,
        'event_object_table', event_object_table,
        'action_statement', action_statement,
        'action_timing', action_timing
      ))
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
    ),
    'functions', (
      SELECT json_agg(json_build_object(
        'routine_name', routine_name,
        'data_type', data_type,
        'external_language', external_language,
        'routine_definition', routine_definition
      ))
      FROM information_schema.routines
      WHERE routine_schema = 'public'
    ),
    'foreign_keys', (
      SELECT json_agg(json_build_object(
        'table_name', table_name,
        'column_name', column_name,
        'constraint_name', constraint_name,
        'referenced_table_name', referenced_table_name,
        'referenced_column_name', referenced_column_name
      ))
      FROM (
        SELECT
          kcu.table_name,
          kcu.column_name,
          tc.constraint_name,
          ccu.table_name AS referenced_table_name,
          ccu.column_name AS referenced_column_name
        FROM information_schema.key_column_usage kcu
        JOIN information_schema.table_constraints tc
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ) fk
    )
  ) INTO schema_data;

  RETURN schema_data;
END;
$$;

-- Grant execute permission to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_schema_info TO authenticated;

-- Comment function to ensure it's picked up by PostgREST
COMMENT ON FUNCTION get_schema_info IS 'Retrieves complete database schema information including tables, policies, indexes, triggers, and functions';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';