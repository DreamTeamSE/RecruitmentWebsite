#!/bin/bash

# Frontend Deployment Script
# This script handles deployment of the Next.js frontend application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check Node.js version
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js >= 18.0.0"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if ! node -e "process.exit(process.version.slice(1) >= '$REQUIRED_VERSION' ? 0 : 1)" 2>/dev/null; then
        print_error "Node.js version $NODE_VERSION is not supported. Please install Node.js >= $REQUIRED_VERSION"
        exit 1
    fi
    
    print_status "Node.js version: $NODE_VERSION ✓"
}

# Deploy frontend for development
deploy_dev() {
    print_status "Starting frontend development deployment..."
    
    cd frontend
    
    # Install dependencies
    print_status "Installing frontend dependencies..."
    npm install
    
    # Lint code
    print_status "Running linter..."
    npm run lint
    
    # Check if frontend is already running
    if lsof -ti:3001 > /dev/null 2>&1; then
        print_warning "Frontend is already running on port 3001"
        print_status "Stopping existing process..."
        kill $(lsof -ti:3001) || true
        sleep 2
    fi
    
    # Start development server
    print_status "Starting frontend development server..."
    nohup npm run dev > frontend-dev.log 2>&1 &
    
    # Wait for server to start
    sleep 5
    
    # Check if frontend is running
    if lsof -ti:3001 > /dev/null 2>&1; then
        print_status "Frontend development server started successfully!"
        print_status "Application: http://localhost:3001"
        print_status "Logs: frontend/frontend-dev.log"
    else
        print_error "Failed to start frontend development server"
        exit 1
    fi
    
    cd ..
}

# Deploy frontend for production
deploy_prod() {
    print_status "Starting frontend production deployment..."
    
    cd frontend
    
    # Install dependencies
    print_status "Installing frontend dependencies..."
    npm install
    
    # Lint and build
    print_status "Running release build (lint + build)..."
    npm run release
    
    # Check if frontend is already running
    if lsof -ti:3000 > /dev/null 2>&1; then
        print_warning "Frontend is already running on port 3000"
        print_status "Stopping existing process..."
        kill $(lsof -ti:3000) || true
        sleep 2
    fi
    
    # Start production server
    print_status "Starting frontend production server..."
    nohup npm start > frontend-prod.log 2>&1 &
    
    # Wait for server to start
    sleep 5
    
    # Check if frontend is running
    if lsof -ti:3000 > /dev/null 2>&1; then
        print_status "Frontend production server started successfully!"
        print_status "Application: http://localhost:3000"
        print_status "Logs: frontend/frontend-prod.log"
    else
        print_error "Failed to start frontend production server"
        exit 1
    fi
    
    cd ..
}

# Build only (for CI/CD)
build_only() {
    print_status "Building frontend application..."
    
    cd frontend
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm install
    
    # Build the application
    print_status "Running production build..."
    npm run build
    
    print_status "Build completed successfully!"
    print_status "Built files are in frontend/.next/"
    
    cd ..
}

# Main deployment function
main() {
    print_status "Starting frontend deployment..."
    
    # Check prerequisites
    check_node
    
    # Deploy based on environment
    case "${2:-dev}" in
        "dev"|"development")
            deploy_dev
            ;;
        "prod"|"production")
            deploy_prod
            ;;
        *)
            print_error "Invalid environment. Use 'dev' or 'prod'"
            exit 1
            ;;
    esac
    
    print_status "Frontend deployment completed successfully!"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main "$@"
        ;;
    "dev"|"development")
        check_node
        deploy_dev
        ;;
    "prod"|"production")
        check_node
        deploy_prod
        ;;
    "build")
        check_node
        build_only
        ;;
    "stop")
        print_status "Stopping frontend servers..."
        # Stop development server (port 3001)
        if lsof -ti:3001 > /dev/null 2>&1; then
            kill $(lsof -ti:3001)
            print_status "Development server stopped"
        fi
        # Stop production server (port 3000)
        if lsof -ti:3000 > /dev/null 2>&1; then
            kill $(lsof -ti:3000)
            print_status "Production server stopped"
        fi
        print_status "All frontend servers stopped"
        ;;
    "logs")
        if [ -f "frontend/frontend-dev.log" ]; then
            print_status "Development logs:"
            tail -f frontend/frontend-dev.log
        elif [ -f "frontend/frontend-prod.log" ]; then
            print_status "Production logs:"
            tail -f frontend/frontend-prod.log
        else
            print_error "No log files found"
            exit 1
        fi
        ;;
    *)
        echo "Usage: $0 [deploy|dev|prod|build|stop|logs] [environment]"
        echo "  deploy [dev|prod] - Deploy frontend (default: dev)"
        echo "  dev               - Deploy in development mode"
        echo "  prod              - Deploy in production mode"
        echo "  build             - Build only (no server start)"
        echo "  stop              - Stop all frontend servers"
        echo "  logs              - Show frontend logs"
        exit 1
        ;;
esac