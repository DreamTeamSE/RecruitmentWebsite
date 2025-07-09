#!/bin/bash

# Script to stop local development servers

echo "🛑 Stopping Local Development Servers"
echo "===================================="

# Kill backend processes
echo "Stopping backend server..."
pkill -f "ts-node src/index.ts" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true

# Kill frontend processes  
echo "Stopping frontend server..."
pkill -f "next" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

# Wait a moment
sleep 2

# Check if any processes are still running
if pgrep -f "ts-node\|next" >/dev/null; then
    echo "⚠️  Some processes may still be running:"
    pgrep -f "ts-node\|next" | while read pid; do
        ps -p $pid -o pid,ppid,cmd
    done
    echo ""
    echo "Use 'kill -9 <pid>' to force stop if needed"
else
    echo "✅ All local development servers stopped"
fi

echo ""
echo "📊 Current port usage:"
lsof -i :3000 -i :3001 2>/dev/null || echo "  No services running on ports 3000-3001"

echo ""
echo "🗄️  PostgreSQL status:"
if pg_ctl status -D /opt/homebrew/var/postgresql@14 >/dev/null 2>&1; then
    echo "  ✅ PostgreSQL is still running (keeping it running for development)"
else
    echo "  ❌ PostgreSQL is not running"
fi

echo ""
echo "✨ Local servers stopped successfully!"