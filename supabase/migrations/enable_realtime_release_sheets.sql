-- Enable real-time updates for release_sheets table
-- This allows multiple users to see changes in real-time when editing the same release sheet

-- Enable real-time for the release_sheets table
ALTER PUBLICATION supabase_realtime ADD TABLE release_sheets;

-- Grant necessary permissions for real-time updates
GRANT SELECT ON release_sheets TO anon, authenticated;
GRANT UPDATE ON release_sheets TO authenticated;
