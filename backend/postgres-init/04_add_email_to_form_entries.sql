-- Migration: Add email field to form entries
-- This adds the applicant_email column to store email addresses in form entries

ALTER TABLE formentries 
ADD COLUMN IF NOT EXISTS applicant_email TEXT;