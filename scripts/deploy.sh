#!/bin/bash

# Recruitment Website Deployment Script
# Simplified deployment for local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  local       Deploy for local development"
    echo "  build       Build applications only"
    echo "  clean       Clean up local resources"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 local"
    echo "  $0 build"
    echo "  $0 clean"
}

# Function to check prerequisites
check_prerequisites() {
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
    
    log "Prerequisites check completed ✓"
}

# Function to setup backend
setup_backend() {
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
    
    cd ..
    log "Backend setup completed ✓"
}

# Function to setup frontend
setup_frontend() {
    log "Setting up frontend..."
    cd frontend
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
        log "Installing frontend dependencies..."
        npm install
    fi
    
    # Build frontend
    log "Building frontend..."
    npm run build
    
    cd ..
    log "Frontend setup completed ✓"
}

# Function to deploy locally
deploy_local() {
    log "Starting local deployment..."
    
    check_prerequisites
    setup_backend
    setup_frontend
    
    # Kill any existing processes
    pkill -f "ts-node src/index.ts" 2>/dev/null || true
    pkill -f "next" 2>/dev/null || true
    sleep 2
    
    # Start backend
    log "Starting backend server..."
    cd backend
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
    info "🔧 To stop services: pkill -f 'ts-node\\|next'"
}

# Function to build only
build_only() {
    log "Building applications..."
    
    setup_backend
    setup_frontend
    
    log "🎉 Build completed successfully!"
}

# Function to clean up
cleanup() {
    log "Cleaning up local resources..."
    
    # Stop services
    pkill -f "ts-node src/index.ts" 2>/dev/null || true
    pkill -f "next" 2>/dev/null || true
    
    # Clean build artifacts
    rm -rf backend/dist 2>/dev/null || true
    rm -rf frontend/.next 2>/dev/null || true
    
    log "Cleanup completed ✓"
}

# Main script logic
case "${1:-}" in
    "local")
        deploy_local
        ;;
    "build")
        build_only
        ;;
    "clean")
        cleanup
        ;;
    "help"|"--help"|"-h")
        show_usage
        ;;
    "")
        error "No command provided"
        show_usage
        exit 1
        ;;
    *)
        error "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac