-- Create unified staff table (replaces the old recruiters table)
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'staff',
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token UUID,
    email_verification_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);

-- Create index on verification token for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_verification_token ON staff(email_verification_token);

-- For backward compatibility, create a view that maps to the old recruiters table structure
CREATE VIEW recruiters AS 
SELECT 
    id as uuid,
    first_name,
    last_name,
    email,
    role
FROM staff;

CREATE TABLE Applicants (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL
);
