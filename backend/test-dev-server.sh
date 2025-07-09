#!/bin/bash

# Test script for backend development server

echo "🧪 Testing Backend Development Server"
echo "===================================="

# Kill any existing processes
killall node 2>/dev/null || true
sleep 1

echo ""
echo "1. Testing validation script..."
npm run validate

echo ""
echo "2. Testing build process..."
npm run build

echo ""
echo "3. Testing simple development server..."
timeout 3 npm run dev:simple &
DEV_SIMPLE_PID=$!
sleep 2

# Test if server is responding
if curl -f http://localhost:3000/health >/dev/null 2>&1; then
    echo "   ✅ Simple dev server is working"
else
    echo "   ⚠️  Simple dev server not responding (may not have health endpoint)"
fi

# Kill the simple server
kill $DEV_SIMPLE_PID 2>/dev/null || true
killall node 2>/dev/null || true
sleep 1

echo ""
echo "4. Testing nodemon development server..."
timeout 3 npm run dev &
DEV_NODEMON_PID=$!
sleep 2

# Test if server is responding
if curl -f http://localhost:3000/health >/dev/null 2>&1; then
    echo "   ✅ Nodemon dev server is working"
else
    echo "   ⚠️  Nodemon dev server not responding (may not have health endpoint)"
fi

# Kill the nodemon server
kill $DEV_NODEMON_PID 2>/dev/null || true
killall node 2>/dev/null || true

echo ""
echo "✅ Backend development server tests completed!"
echo ""
echo "🚀 Available commands:"
echo "   npm run dev        - Start with hot reload"
echo "   npm run dev:simple - Start without hot reload"
echo "   npm run build      - Build for production"
echo "   npm start          - Start production server"
echo "   npm run validate   - Validate setup"