#!/bin/bash

# Environment Setup Script
# This script helps set up environment variables for development and production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Function to setup backend environment
setup_backend_env() {
    log "Setting up backend environment..."
    
    if [ ! -f "backend/.env.local" ]; then
        cp backend/.env.template backend/.env.local
        log "Created backend/.env.local from template"
        warning "Please edit backend/.env.local with your actual values"
    else
        info "Backend .env.local already exists"
    fi
}

# Function to setup frontend environment
setup_frontend_env() {
    log "Setting up frontend environment..."
    
    if [ ! -f "frontend/.env.local" ]; then
        cp frontend/.env.template frontend/.env.local
        log "Created frontend/.env.local from template"
        warning "Please edit frontend/.env.local with your actual values"
    else
        info "Frontend .env.local already exists"
    fi
}

# Function to install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    # Install root dependencies
    npm install
    
    # Install backend dependencies
    cd backend
    npm install
    cd ..
    
    # Install frontend dependencies
    cd frontend
    npm install
    cd ..
    
    log "Dependencies installed successfully"
}

# Function to validate environment
validate_environment() {
    log "Validating environment setup..."
    
    # Check backend environment
    if [ -f "backend/.env.local" ]; then
        info "✅ Backend environment file exists"
    else
        error "❌ Backend environment file missing"
        return 1
    fi
    
    # Check frontend environment
    if [ -f "frontend/.env.local" ]; then
        info "✅ Frontend environment file exists"
    else
        error "❌ Frontend environment file missing"
        return 1
    fi
    
    # Check if dependencies are installed
    if [ -d "node_modules" ] && [ -d "backend/node_modules" ] && [ -d "frontend/node_modules" ]; then
        info "✅ All dependencies installed"
    else
        error "❌ Dependencies not properly installed"
        return 1
    fi
    
    log "Environment validation completed"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  init           Initialize all environment files and install dependencies"
    echo "  backend        Setup backend environment only"
    echo "  frontend       Setup frontend environment only"
    echo "  install        Install dependencies only"
    echo "  validate       Validate environment setup"
    echo "  help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 init"
    echo "  $0 backend"
    echo "  $0 validate"
}

# Main logic
case "${1:-}" in
    "init")
        log "Initializing development environment..."
        setup_backend_env
        setup_frontend_env
        install_dependencies
        validate_environment
        log "Environment setup completed!"
        echo ""
        warning "IMPORTANT: Please edit the .env.local files with your actual values before running the application"
        ;;
    "backend")
        setup_backend_env
        ;;
    "frontend")
        setup_frontend_env
        ;;
    "install")
        install_dependencies
        ;;
    "validate")
        validate_environment
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
