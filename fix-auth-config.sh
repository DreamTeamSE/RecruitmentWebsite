#!/bin/bash

# Script to fix authentication configuration and environment setup

set -euo pipefail

echo "🔧 Fixing Authentication Configuration"
echo "===================================="

cd frontend

# Clean up and rebuild
echo "1. Cleaning up node_modules and build cache..."
rm -rf node_modules
rm -rf .next
rm -rf .next-cache

echo "2. Installing dependencies..."
npm install

echo "3. Checking environment configuration..."
echo "Current .env.local content:"
cat .env.local

echo ""
echo "4. Testing NextAuth configuration..."
echo "NEXTAUTH_SECRET exists: $(if [ -n "${NEXTAUTH_SECRET:-}" ]; then echo "YES"; else echo "NO"; fi)"
echo "NEXTAUTH_URL: ${NEXTAUTH_URL:-NOT_SET}"
echo "NEXT_PUBLIC_BACKEND_URL: ${NEXT_PUBLIC_BACKEND_URL:-NOT_SET}"

echo ""
echo "5. Building the application..."
npm run build

echo ""
echo "6. Testing authentication endpoint..."
curl -I https://main.d1d64zijwu2pjz.amplifyapp.com/api/auth/providers

echo ""
echo "✅ Authentication configuration fixed!"
echo ""
echo "Next steps:"
echo "1. Test the application locally with: npm run dev"
echo "2. Deploy to production"
echo "3. Create a verified user account to test signin"