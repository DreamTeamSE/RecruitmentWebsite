#!/bin/bash

# Enhanced Backend Deployment Script
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

cleanup() {
    log_warn "Cleaning up..."
    cd "$BACKEND_DIR"
    docker compose down
    exit 1
}

trap cleanup INT TERM

# Parse command line arguments
ENVIRONMENT="development"
SKIP_BUILD=false
MONITORING=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --monitoring)
            MONITORING=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --env ENV          Environment (development|production) [default: development]"
            echo "  --skip-build       Skip building Docker images"
            echo "  --monitoring       Start monitoring stack"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

log_info "Starting backend deployment for environment: $ENVIRONMENT"

# Change to backend directory
cd "$BACKEND_DIR"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    log_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check for environment file
ENV_FILE=".env.local"
if [[ "$ENVIRONMENT" == "production" ]]; then
    ENV_FILE=".env.production"
fi

if [[ ! -f "$ENV_FILE" ]]; then
    log_warn "Environment file $ENV_FILE not found. Using .env.example as template."
    if [[ -f ".env.example" ]]; then
        cp ".env.example" "$ENV_FILE"
        log_warn "Please update $ENV_FILE with your actual values before proceeding."
    fi
fi

# Stop any running containers
log_info "Stopping existing containers..."
docker compose down

# Build images if not skipping
if [[ "$SKIP_BUILD" == false ]]; then
    log_info "Building Docker images..."
    docker compose build --no-cache
fi

# Start services based on environment
COMPOSE_FILE="docker-compose.yml"
if [[ "$ENVIRONMENT" == "production" ]]; then
    COMPOSE_FILE="docker-compose.production.yml"
fi

log_info "Starting services with $COMPOSE_FILE..."
docker compose -f "$COMPOSE_FILE" up -d

# Wait for services to be healthy
log_info "Waiting for services to be healthy..."
timeout=120
counter=0

while [[ $counter -lt $timeout ]]; do
    if docker compose -f "$COMPOSE_FILE" ps | grep -q "healthy\|Up"; then
        log_info "Services are starting up..."
        sleep 5
        
        # Check if backend health endpoint is responding
        if curl -sf http://localhost:3000/health >/dev/null 2>&1; then
            log_info "Backend is healthy!"
            break
        fi
    fi
    
    counter=$((counter + 5))
    log_info "Waiting for services... ($counter/$timeout seconds)"
    sleep 5
done

if [[ $counter -ge $timeout ]]; then
    log_error "Services failed to start within $timeout seconds"
    docker compose -f "$COMPOSE_FILE" logs
    exit 1
fi

# Start monitoring stack if requested
if [[ "$MONITORING" == true ]]; then
    log_info "Starting monitoring stack..."
    docker compose -f docker-compose.monitoring.yml up -d
    log_info "Monitoring available at:"
    log_info "  - Grafana: http://localhost:3001 (admin/admin)"
    log_info "  - Prometheus: http://localhost:9090"
fi

# Display service status
log_info "Deployment complete! Services status:"
docker compose -f "$COMPOSE_FILE" ps

log_info "Backend services are running:"
log_info "  - Backend API: http://localhost:3000"
log_info "  - Health Check: http://localhost:3000/health"
log_info "  - Database: localhost:5432"

if [[ "$ENVIRONMENT" == "development" ]]; then
    log_info "  - Redis: localhost:6379"
    log_info "  - Debug port: localhost:9229"
fi

log_info "View logs with: docker compose -f $COMPOSE_FILE logs -f"