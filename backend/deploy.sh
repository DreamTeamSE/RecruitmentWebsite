#!/bin/bash

# Simple Deployment Script for Recruitment Backend
set -e

echo "🚀 Starting Recruitment Backend Deployment..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env exists
if [[ ! -f ".env" ]]; then
    log_error ".env file not found!"
    log_info "Creating .env file from template..."
    cp .env.example .env 2>/dev/null || {
        echo "NODE_ENV=development" > .env
        echo "PORT=3000" >> .env
        echo "DATABASE_URL=postgresql://admin:admin@postgres:5432/postgres" >> .env
        echo "JWT_SECRET=dev-jwt-secret-change-for-production" >> .env
        echo "CORS_ORIGIN=http://localhost:3001" >> .env
        echo "FRONTEND_URL=http://localhost:3001" >> .env
    }
    log_info "✅ Created .env file. Please update it with your values."
fi

# Install dependencies
log_step "Installing dependencies..."
npm install

# Build the application
log_step "Building application..."
npm run build

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    log_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Stop existing containers
log_step "Stopping existing containers..."
docker-compose -f docker-compose.simple.yml down --remove-orphans || true

# Build and start containers
log_step "Building and starting containers..."
docker-compose -f docker-compose.simple.yml up --build -d

# Wait for services to be ready
log_step "Waiting for services to be ready..."
sleep 10

# Check health
log_step "Checking application health..."
for i in {1..30}; do
    if curl -f http://localhost:3000/health >/dev/null 2>&1; then
        log_info "✅ Backend is healthy!"
        break
    fi
    if [[ $i -eq 30 ]]; then
        log_error "❌ Backend health check failed after 30 attempts"
        log_info "Showing logs:"
        docker-compose -f docker-compose.simple.yml logs app
        exit 1
    fi
    echo "Waiting... ($i/30)"
    sleep 2
done

echo ""
log_info "🎉 Deployment completed successfully!"
echo ""
log_info "📋 Service URLs:"
log_info "  Backend API: http://localhost:3000"
log_info "  Health Check: http://localhost:3000/health"
log_info "  Database: localhost:5432"
echo ""
log_info "🔧 Useful commands:"
log_info "  View logs: npm run docker:logs"
log_info "  Stop services: npm run docker:down"
log_info "  Restart: ./deploy.sh"
echo ""

# Test basic endpoints
log_step "Testing basic endpoints..."
echo "Health Check:"
curl -s http://localhost:3000/health | jq . 2>/dev/null || curl -s http://localhost:3000/health

echo ""
log_info "✅ Deployment verification completed!"