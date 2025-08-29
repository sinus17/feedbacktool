-- Create the exec function first
CREATE OR REPLACE FUNCTION exec(sql text) RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;