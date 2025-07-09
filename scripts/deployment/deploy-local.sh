#!/bin/bash

# Local Deployment Script for Recruitment Website
# Deploys both backend and frontend locally with local PostgreSQL database

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

echo -e "${BLUE}🚀 Local Recruitment Website Deployment${NC}"
echo -e "${BLUE}=======================================${NC}"
echo

# Step 1: Check Prerequisites
log "Checking prerequisites..."

# Check if PostgreSQL is running
if ! pg_ctl status -D /opt/homebrew/var/postgresql@14 >/dev/null 2>&1; then
    warning "PostgreSQL is not running. Starting PostgreSQL..."
    pg_ctl start -D /opt/homebrew/var/postgresql@14
    sleep 2
fi

# Check if database exists
if ! psql -lqt | cut -d '|' -f 1 | grep -qw recruitment_local; then
    log "Creating local database..."
    createdb recruitment_local
    psql -d recruitment_local -c "CREATE USER recruitment_user WITH PASSWORD 'local_password';" 2>/dev/null || true
    psql -d recruitment_local -c "GRANT ALL PRIVILEGES ON DATABASE recruitment_local TO recruitment_user;"
    psql -d recruitment_local -c "GRANT ALL ON SCHEMA public TO recruitment_user;"
fi

echo

# Step 2: Setup Backend
log "Setting up backend..."
cd backend

# Install dependencies
if [ ! -d "node_modules" ]; then
    log "Installing backend dependencies..."
    npm install
fi

# Setup database schema
log "Setting up database schema..."
psql -d recruitment_local -f postgres-init/01_user.sql 2>/dev/null || true
psql -d recruitment_local -f postgres-init/02_applications.sql 2>/dev/null || true
psql -d recruitment_local -f postgres-init/03_interview.sql 2>/dev/null || true
psql -d recruitment_local -f postgres-init/04_add_email_to_form_entries.sql 2>/dev/null || true
psql -d recruitment_local -f postgres-init/05_make_email_required.sql 2>/dev/null || true

# Grant permissions
psql -d recruitment_local -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO recruitment_user;"
psql -d recruitment_local -c "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO recruitment_user;"

# Build backend
log "Building backend..."
npm run build

echo

# Step 3: Setup Frontend
log "Setting up frontend..."
cd ../frontend

# Install dependencies
if [ ! -d "node_modules" ]; then
    log "Installing frontend dependencies..."
    npm install
fi

# Build frontend
log "Building frontend..."
npm run build

echo

# Step 4: Start Services
log "Starting services..."

# Kill any existing processes
pkill -f "ts-node src/index.ts" 2>/dev/null || true
pkill -f "next" 2>/dev/null || true
sleep 2

# Start backend
log "Starting backend server..."
cd ../backend
NODE_ENV=development DATABASE_URL="postgresql://recruitment_user:local_password@localhost:5432/recruitment_local" npm run dev &
BACKEND_PID=$!
sleep 3

# Test backend
if curl -f http://localhost:3000/health >/dev/null 2>&1; then
    log "✅ Backend is running at http://localhost:3000"
else
    error "❌ Backend failed to start"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start frontend
log "Starting frontend server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!
sleep 5

# Test frontend
if curl -f http://localhost:3001 >/dev/null 2>&1; then
    log "✅ Frontend is running at http://localhost:3001"
else
    error "❌ Frontend failed to start"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

echo
log "🎉 Local deployment completed successfully!"
echo
info "📊 Service Status:"
info "  Backend:  http://localhost:3000"
info "  Frontend: http://localhost:3001"
info "  Database: recruitment_local on localhost:5432"
echo
info "🧪 Test Endpoints:"
info "  Health:      http://localhost:3000/health"
info "  Forms Feed:  http://localhost:3000/api/forms/feed" 
info "  Frontend:    http://localhost:3001"
echo
info "🔧 Useful Commands:"
info "  Backend logs:  tail -f backend/logs/*.log"
info "  Database:      psql -d recruitment_local"
info "  Stop services: pkill -f 'ts-node\\|next'"
echo
warning "💡 Note: Services are running in the background"
warning "   Use 'pkill -f \"ts-node\\|next\"' to stop all services"
echo
log "✨ Happy developing!"