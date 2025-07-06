-- Migration: Make applicant_email required in FormEntries table
-- This updates the existing column to be NOT NULL and adds validation

DO $$ 
BEGIN
    -- Check if the column exists and is nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'formentries' 
        AND column_name = 'applicant_email'
        AND is_nullable = 'YES'
    ) THEN
        -- First, update any existing NULL values to have a placeholder
        -- In production, you might want to handle this differently
        UPDATE FormEntries 
        SET applicant_email = 'migration-placeholder@example.com' 
        WHERE applicant_email IS NULL;
        
        -- Now make the column NOT NULL
        ALTER TABLE FormEntries ALTER COLUMN applicant_email SET NOT NULL;
        
        RAISE NOTICE 'Updated applicant_email column to be NOT NULL in FormEntries table';
    ELSE
        RAISE NOTICE 'applicant_email column is already NOT NULL or does not exist';
    END IF;
END $$;
