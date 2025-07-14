#!/bin/bash

# Backend and Database Deployment Script
# This script handles deployment of the backend API and PostgreSQL database

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

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Deploy database
deploy_database() {
    print_status "Starting PostgreSQL database deployment..."
    
    cd backend
    
    # Check if database is already running
    if docker ps | grep -q "postgresdb"; then
        print_warning "Database container is already running"
        print_status "Checking database health..."
        docker-compose exec postgres pg_isready -U admin
    else
        print_status "Starting database container..."
        docker-compose up -d postgres
        
        print_status "Waiting for database to be ready..."
        sleep 10
        
        # Wait for database to be healthy
        timeout=60
        counter=0
        while [ $counter -lt $timeout ]; do
            if docker-compose exec postgres pg_isready -U admin > /dev/null 2>&1; then
                print_status "Database is ready!"
                break
            fi
            sleep 2
            counter=$((counter + 2))
        done
        
        if [ $counter -ge $timeout ]; then
            print_error "Database failed to start within $timeout seconds"
            exit 1
        fi
    fi
    
    cd ..
}

# Deploy backend
deploy_backend() {
    print_status "Starting backend deployment..."
    
    cd backend
    
    # Install dependencies
    print_status "Installing backend dependencies..."
    npm install
    
    # Type check
    print_status "Running type check..."
    npm run type-check
    
    # Lint code
    print_status "Running linter..."
    npm run lint
    
    # Build the application
    print_status "Building backend application..."
    npm run build
    
    # Check if backend is already running
    if pgrep -f "node dist/index.js" > /dev/null; then
        print_warning "Backend is already running. Stopping existing process..."
        pkill -f "node dist/index.js" || true
        sleep 2
    fi
    
    # Start the backend
    print_status "Starting backend server..."
    nohup npm start > backend.log 2>&1 &
    
    # Wait a moment for the server to start
    sleep 5
    
    # Check if backend is running
    if pgrep -f "node dist/index.js" > /dev/null; then
        print_status "Backend server started successfully!"
        print_status "Logs are being written to backend/backend.log"
    else
        print_error "Failed to start backend server"
        exit 1
    fi
    
    cd ..
}

# Main deployment function
main() {
    print_status "Starting backend and database deployment..."
    
    # Check prerequisites
    check_docker
    
    # Deploy components
    deploy_database
    deploy_backend
    
    print_status "Backend and database deployment completed successfully!"
    print_status "Database: PostgreSQL running on port 5432"
    print_status "Backend API: Running on port 8080 (check backend/backend.log for details)"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "database"|"db")
        check_docker
        deploy_database
        ;;
    "backend"|"api")
        deploy_backend
        ;;
    "stop")
        print_status "Stopping backend and database..."
        pkill -f "node dist/index.js" || true
        cd backend && docker-compose down
        print_status "Services stopped"
        ;;
    "logs")
        print_status "Backend logs:"
        tail -f backend/backend.log
        ;;
    *)
        echo "Usage: $0 [deploy|database|backend|stop|logs]"
        echo "  deploy    - Deploy both database and backend (default)"
        echo "  database  - Deploy only the database"
        echo "  backend   - Deploy only the backend"
        echo "  stop      - Stop all services"
        echo "  logs      - Show backend logs"
        exit 1
        ;;
esac