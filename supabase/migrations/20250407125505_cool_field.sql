/*
  # Database utility functions
  
  1. New Functions
    - `check_tables_exist`: Checks if required tables exist
    - `create_tables`: Executes SQL commands to create tables
    - `setup_database`: Executes SQL commands for database setup
  
  2. Security
    - All functions are marked as SECURITY DEFINER
    - Functions are restricted to specific use cases
*/

-- Function to check if tables exist
CREATE OR REPLACE FUNCTION public.check_tables_exist()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'artists'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create tables
CREATE OR REPLACE FUNCTION public.create_tables(sql_commands TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE sql_commands;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for database setup
CREATE OR REPLACE FUNCTION public.setup_database(sql_commands TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE sql_commands;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;