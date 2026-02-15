-- Add gérant role to users table
-- First, drop and recreate the constraint with the new role

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'coiffeur', 'gerant'));

-- Add salon_id column for gérants (managers are assigned to specific salons)
ALTER TABLE users ADD COLUMN IF NOT EXISTS salon_id UUID REFERENCES salons(id) ON DELETE SET NULL;

-- Create index on salon_id
CREATE INDEX IF NOT EXISTS idx_users_salon_id ON users(salon_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
