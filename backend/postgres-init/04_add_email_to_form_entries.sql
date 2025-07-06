-- Migration: Add email column to FormEntries table
-- This adds the applicant_email column if it doesn't already exist

DO $$ 
BEGIN
    -- Check if the column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'formentries' 
        AND column_name = 'applicant_email'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE FormEntries ADD COLUMN applicant_email TEXT;
        RAISE NOTICE 'Added applicant_email column to FormEntries table';
    ELSE
        RAISE NOTICE 'applicant_email column already exists in FormEntries table';
    END IF;
END $$;
