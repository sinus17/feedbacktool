/*
  # Create Database Utility Functions

  1. New Functions
    - `check_tables_exist()` - Checks if required tables exist in the database
    - `create_tables(sql_commands TEXT)` - Executes SQL commands for table creation
  
  2. Security
    - Both functions use SECURITY DEFINER for elevated privileges
    - Functions are created in the public schema for accessibility
*/

-- Create a function to check if tables exist
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

-- Create a function to execute SQL commands
CREATE OR REPLACE FUNCTION create_tables(sql_commands TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE sql_commands;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;