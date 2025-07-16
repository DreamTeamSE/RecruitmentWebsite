#!/bin/bash

# Production Deployment Script for Backend
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root (not recommended for production)
if [[ $EUID -eq 0 ]]; then
   log_error "This script should not be run as root for security reasons."
   exit 1
fi

# Change to backend directory
cd "$BACKEND_DIR"

# Production pre-flight checks
log_step "Running production pre-flight checks..."

# Check Docker and Docker Compose
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    log_error "Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

# Check if Docker daemon is running
if ! docker info >/dev/null 2>&1; then
    log_error "Docker daemon is not running. Please start Docker."
    exit 1
fi

# Check for production environment file
if [[ ! -f ".env.production" ]]; then
    log_error "Production environment file .env.production not found."
    log_info "Please create .env.production with production values."
    log_info "You can copy from .env.example and modify the values."
    exit 1
fi

# Validate critical environment variables
log_step "Validating environment configuration..."
source .env.production

REQUIRED_VARS=("POSTGRES_PASSWORD" "JWT_SECRET" "FRONTEND_URL")
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        log_error "Required environment variable $var is not set in .env.production"
        exit 1
    fi
done

# Check if production secrets are not default values
if [[ "$JWT_SECRET" == "your-super-secure-jwt-secret-here" ]]; then
    log_error "JWT_SECRET is still set to default value. Please use a secure secret."
    exit 1
fi

if [[ "$POSTGRES_PASSWORD" == "secure-password-here" ]]; then
    log_error "POSTGRES_PASSWORD is still set to default value. Please use a secure password."
    exit 1
fi

# Backup existing data
log_step "Creating backup of existing data..."
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Export existing database if containers are running
if docker compose -f docker-compose.production.yml ps | grep -q "Up"; then
    log_info "Backing up existing database..."
    docker compose -f docker-compose.production.yml exec -T postgres pg_dumpall -c -U postgres > "$BACKUP_DIR/database_backup.sql" || log_warn "Could not create database backup"
fi

# Stop existing services
log_step "Stopping existing services..."
docker compose -f docker-compose.production.yml down

# Pull latest images and build
log_step "Building production images..."
docker compose -f docker-compose.production.yml build --no-cache

# Start production services
log_step "Starting production services..."
docker compose -f docker-compose.production.yml up -d

# Wait for services to be healthy
log_step "Waiting for services to be healthy..."
timeout=180
counter=0

while [[ $counter -lt $timeout ]]; do
    # Check if all services are up
    if docker compose -f docker-compose.production.yml ps | grep -q "healthy\|Up"; then
        log_info "Services are starting up..."
        sleep 10
        
        # Check backend health
        if curl -sf http://localhost:3000/health >/dev/null 2>&1; then
            log_info "Backend health check passed!"
            
            # Check database connectivity through health endpoint
            health_response=$(curl -s http://localhost:3000/health)
            if echo "$health_response" | grep -q '"status":"healthy"'; then
                log_info "All services are healthy!"
                break
            fi
        fi
    fi
    
    counter=$((counter + 10))
    log_info "Waiting for services... ($counter/$timeout seconds)"
    sleep 10
done

if [[ $counter -ge $timeout ]]; then
    log_error "Services failed to start within $timeout seconds"
    log_error "Checking logs for issues..."
    docker compose -f docker-compose.production.yml logs --tail=50
    
    # Rollback option
    log_warn "Would you like to restore from backup? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        if [[ -f "$BACKUP_DIR/database_backup.sql" ]]; then
            log_info "Restoring database from backup..."
            docker compose -f docker-compose.production.yml up -d postgres
            sleep 30
            docker compose -f docker-compose.production.yml exec -T postgres psql -U postgres < "$BACKUP_DIR/database_backup.sql"
        fi
    fi
    exit 1
fi

# Run production smoke tests
log_step "Running production smoke tests..."

# Test database connectivity
log_info "Testing database connectivity..."
if ! docker compose -f docker-compose.production.yml exec -T postgres pg_isready -U postgres; then
    log_error "Database connectivity test failed"
    exit 1
fi

# Test backend API endpoints
log_info "Testing API endpoints..."
health_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [[ "$health_status" != "200" ]]; then
    log_error "Health endpoint test failed (HTTP $health_status)"
    exit 1
fi

# Check if logs show any immediate errors
error_count=$(docker compose -f docker-compose.production.yml logs --since=5m | grep -i error | wc -l)
if [[ $error_count -gt 0 ]]; then
    log_warn "Found $error_count error(s) in recent logs. Please review:"
    docker compose -f docker-compose.production.yml logs --since=5m | grep -i error
fi

# Production deployment summary
log_step "Production deployment completed successfully!"
echo ""
log_info "=== PRODUCTION DEPLOYMENT SUMMARY ==="
log_info "Environment: Production"
log_info "Backup created: $BACKUP_DIR"
log_info "Services status:"
docker compose -f docker-compose.production.yml ps

echo ""
log_info "=== SERVICE ENDPOINTS ==="
log_info "Backend API: http://localhost:3000"
log_info "Health Check: http://localhost:3000/health"
log_info "Database: localhost:5432"

echo ""
log_info "=== MONITORING & MAINTENANCE ==="
log_info "View logs: docker compose -f docker-compose.production.yml logs -f"
log_info "Monitor services: docker compose -f docker-compose.production.yml ps"
log_info "Backup location: $BACKUP_DIR"

echo ""
log_info "=== SECURITY REMINDERS ==="
log_warn "- Ensure firewall rules are properly configured"
log_warn "- Regularly update Docker images and dependencies"
log_warn "- Monitor logs for suspicious activity"
log_warn "- Set up automated backups for production data"
log_warn "- Consider setting up SSL certificates for HTTPS"

# Set up log rotation for production
log_step "Setting up log rotation..."
cat > /tmp/docker-logrotate << 'EOF'
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    notifempty
    create 0644 root root
    postrotate
        /bin/kill -USR1 $(cat /var/run/docker.pid 2>/dev/null) 2>/dev/null || :
    endscript
}
EOF

sudo mv /tmp/docker-logrotate /etc/logrotate.d/docker 2>/dev/null || log_warn "Could not set up log rotation (requires sudo)"

log_info "Production deployment completed successfully! 🚀"