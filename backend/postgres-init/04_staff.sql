-- This file is now merged with 01_user.sql
-- Staff table is created in 01_user.sql as the unified user model

-- Insert a test staff member for authentication testing
INSERT INTO staff (first_name, last_name, email, password_hash, role, email_verified) 
VALUES ('Test', 'Admin', 'admin@dreamteameng.org', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeIwjO0X9nJQ5VNSe', 'admin', true)
ON CONFLICT (email) DO NOTHING;
-- Default password is 'password123' - change this in production!
