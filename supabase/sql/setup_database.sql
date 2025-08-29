-- Create a function to execute SQL commands
CREATE OR REPLACE FUNCTION public.setup_database(sql_commands TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE sql_commands;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;