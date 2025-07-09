#!/bin/bash

# Script to create a verified test user for authentication testing

set -euo pipefail

echo "👤 Creating Test User for Authentication Testing"
echo "=============================================="

# User details
EMAIL="admin@dreamteameng.org"
PASSWORD="AdminPassword123!"
FIRST_NAME="Admin"
LAST_NAME="User"

echo "Creating user: $EMAIL"

# Step 1: Register the user
echo "Step 1: Registering user..."
REGISTRATION_RESPONSE=$(curl -s -X POST https://d2oc9fk5wyihzt.cloudfront.net/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"firstName\": \"$FIRST_NAME\",
    \"lastName\": \"$LAST_NAME\",
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "Registration response: $REGISTRATION_RESPONSE"

# Check if registration was successful
if echo "$REGISTRATION_RESPONSE" | grep -q "Account created successfully"; then
    echo "✅ User registration successful"
    USER_ID=$(echo "$REGISTRATION_RESPONSE" | grep -o '"userId":"[^"]*' | cut -d'"' -f4)
    echo "User ID: $USER_ID"
else
    echo "❌ User registration failed"
    if echo "$REGISTRATION_RESPONSE" | grep -q "already exists"; then
        echo "User already exists, proceeding to verification check..."
    else
        echo "Registration error: $REGISTRATION_RESPONSE"
        exit 1
    fi
fi

# Step 2: Since we can't directly verify via API, let's manually create a database entry
echo ""
echo "Step 2: Manual verification required"
echo "⚠️  Note: The user needs to be manually verified in the database"
echo ""
echo "To manually verify the user, connect to the database and run:"
echo "psql \"postgresql://postgres:RecruitmentDB2025!@recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com:5432/postgres?sslmode=require\""
echo ""
echo "Then run:"
echo "UPDATE staff SET email_verified = true WHERE email = '$EMAIL';"
echo ""

# Step 3: Test authentication
echo "Step 3: Testing authentication (will fail until user is verified)..."
LOGIN_RESPONSE=$(curl -s -X POST https://d2oc9fk5wyihzt.cloudfront.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "Login response: $LOGIN_RESPONSE"

if echo "$LOGIN_RESPONSE" | grep -q "Please verify your email"; then
    echo "⚠️  User needs email verification (expected)"
elif echo "$LOGIN_RESPONSE" | grep -q "Invalid email or password"; then
    echo "❌ Invalid credentials or user not found"
else
    echo "✅ Login successful!"
fi

echo ""
echo "📋 Test User Details:"
echo "Email: $EMAIL"
echo "Password: $PASSWORD"
echo "Status: Registered, needs verification"
echo ""
echo "🔗 Frontend Login URL: https://main.d1d64zijwu2pjz.amplifyapp.com/auth/signin"
echo ""
echo "📝 Next Steps:"
echo "1. Verify the user in the database"
echo "2. Test login at the frontend"
echo "3. Check for authentication configuration errors"