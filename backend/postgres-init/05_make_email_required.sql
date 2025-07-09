-- Migration: Make email field required
-- This makes the applicant_email column NOT NULL

-- First, update any existing NULL emails with a placeholder
UPDATE formentries 
SET applicant_email = 'unknown@example.com' 
WHERE applicant_email IS NULL;

-- Then make the column NOT NULL
ALTER TABLE formentries 
ALTER COLUMN applicant_email SET NOT NULL;