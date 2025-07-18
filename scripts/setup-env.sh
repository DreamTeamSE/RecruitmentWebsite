#!/bin/bash

# Environment Setup Script for EC2 Deployment
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Generate secure password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Generate JWT secret
generate_jwt_secret() {
    openssl rand -base64 48 | tr -d "=+/" | cut -c1-48
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Setup production environment
setup_production_env() {
    log_step "Setting up production environment file..."
    
    cd "$BACKEND_DIR"
    
    if [[ -f ".env.production" ]]; then
        log_warn "Production environment file already exists"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Keeping existing environment file"
            return 0
        fi
        
        # Backup existing file
        cp .env.production ".env.production.backup.$(date +%Y%m%d_%H%M%S)"
        log_info "Backed up existing environment file"
    fi
    
    log_info "Generating new production environment file..."
    
    # Generate secure values
    JWT_SECRET=$(generate_jwt_secret)
    DB_PASSWORD=$(generate_password)
    REDIS_PASSWORD=$(generate_password)
    
    # Create production environment file
    cat > .env.production << EOF
# EC2 Production Environment Configuration
# Generated on $(date)

# ===== APPLICATION SETTINGS =====
NODE_ENV=production
PORT=3000

# ===== DATABASE CONFIGURATION =====
DATABASE_URL=postgresql://admin:${DB_PASSWORD}@recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com:5432/postgres
POSTGRES_USER=admin
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=postgres

# ===== SECURITY SETTINGS =====
JWT_SECRET=${JWT_SECRET}

# ===== CORS AND FRONTEND SETTINGS =====
CORS_ORIGIN=https://main.d1d64zijwu2pjz.amplifyapp.com
FRONTEND_URL=https://main.d1d64zijwu2pjz.amplifyapp.com

# ===== EMAIL CONFIGURATION (SMTP) =====
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=internal.software@dreamteameng.org
SMTP_PASSWORD=CHANGE_TO_APP_PASSWORD

# ===== REDIS CONFIGURATION =====
REDIS_PASSWORD=${REDIS_PASSWORD}

# ===== AWS CONFIGURATION =====
AWS_REGION=us-east-2

# ===== MONITORING AND LOGGING =====
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true

# ===== RATE LIMITING =====
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ===== HEALTH CHECK CONFIGURATION =====
HEALTH_CHECK_TIMEOUT=5000
HEALTH_CHECK_GRACE_PERIOD=30000

# ===== PRODUCTION OPTIMIZATIONS =====
NODE_OPTIONS="--max-old-space-size=512"

# ===== SSL CONFIGURATION =====
SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
SSL_KEY_PATH=/etc/nginx/ssl/private.key

# ===== BACKUP CONFIGURATION =====
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=7
EOF
    
    chmod 600 .env.production
    
    log_info "✅ Production environment file created: .env.production"
    echo ""
    log_warn "🔐 IMPORTANT: Please update the following values manually:"
    log_warn "    - SMTP_PASSWORD (get app password from Google Account)"
    log_warn "    - DATABASE_URL (if using different database)"
    log_warn "    - CORS_ORIGIN/FRONTEND_URL (if different frontend URL)"
    echo ""
    log_info "📋 Generated secure values:"
    log_info "    - JWT_SECRET: ${JWT_SECRET:0:10}... (48 chars)"
    log_info "    - DB_PASSWORD: ${DB_PASSWORD:0:10}... (32 chars)"
    log_info "    - REDIS_PASSWORD: ${REDIS_PASSWORD:0:10}... (32 chars)"
}

# Setup development environment
setup_development_env() {
    log_step "Setting up development environment file..."
    
    cd "$BACKEND_DIR"
    
    if [[ -f ".env.local" ]]; then
        log_warn "Development environment file already exists"
        return 0
    fi
    
    cat > .env.local << EOF
# Development Environment Configuration
NODE_ENV=development
PORT=3000

# Local database
DATABASE_URL=postgresql://admin:admin@localhost:5432/recruitment_dev
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin
POSTGRES_DB=recruitment_dev

# Development JWT secret
JWT_SECRET=dev-jwt-secret-not-for-production

# CORS settings for development
CORS_ORIGIN=http://localhost:3001
FRONTEND_URL=http://localhost:3001

# Email configuration (optional for development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=internal.software@dreamteameng.org
SMTP_PASSWORD=

# Redis settings
REDIS_PASSWORD=dev-redis-password

# AWS settings (optional for development)
AWS_REGION=us-east-2

# Logging
LOG_LEVEL=debug
ENABLE_REQUEST_LOGGING=true

# Rate limiting (relaxed for development)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000
EOF
    
    log_info "✅ Development environment file created: .env.local"
}

# Validate environment file
validate_env() {
    local env_file="$1"
    
    log_step "Validating environment file: $env_file"
    
    if [[ ! -f "$env_file" ]]; then
        log_error "Environment file not found: $env_file"
        return 1
    fi
    
    # Source the environment file
    source "$env_file"
    
    # Check required variables
    local required_vars=(
        "NODE_ENV"
        "PORT"
        "DATABASE_URL"
        "JWT_SECRET"
        "CORS_ORIGIN"
        "FRONTEND_URL"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        return 1
    fi
    
    # Check for default/insecure values
    local warnings=()
    
    if [[ "$JWT_SECRET" == *"dev"* ]] || [[ "$JWT_SECRET" == *"change"* ]] || [[ ${#JWT_SECRET} -lt 32 ]]; then
        warnings+=("JWT_SECRET appears to be weak or default")
    fi
    
    if [[ "$DATABASE_URL" == *"admin:admin"* ]]; then
        warnings+=("DATABASE_URL uses default credentials")
    fi
    
    if [[ "$SMTP_PASSWORD" == "" ]] || [[ "$SMTP_PASSWORD" == *"CHANGE"* ]]; then
        warnings+=("SMTP_PASSWORD is not set")
    fi
    
    if [[ ${#warnings[@]} -gt 0 ]]; then
        log_warn "⚠️  Security warnings:"
        for warning in "${warnings[@]}"; do
            log_warn "  - $warning"
        done
    fi
    
    log_info "✅ Environment validation completed"
    
    if [[ ${#warnings[@]} -eq 0 ]]; then
        log_info "🔒 All security checks passed"
    fi
}

# Show environment status
show_status() {
    log_step "Environment Status"
    
    cd "$BACKEND_DIR"
    
    echo ""
    log_info "📁 Environment Files:"
    
    if [[ -f ".env.local" ]]; then
        log_info "  ✅ .env.local (development)"
    else
        log_warn "  ❌ .env.local (missing)"
    fi
    
    if [[ -f ".env.production" ]]; then
        log_info "  ✅ .env.production (production)"
    else
        log_warn "  ❌ .env.production (missing)"
    fi
    
    if [[ -f ".env.production.example" ]]; then
        log_info "  📄 .env.production.example (template)"
    fi
    
    echo ""
    log_info "🔧 Quick Commands:"
    log_info "  Setup production: $0 production"
    log_info "  Setup development: $0 development"
    log_info "  Validate: $0 validate .env.production"
    log_info "  Show status: $0 status"
}

# Generate database migration
generate_db_setup() {
    log_step "Generating database setup script..."
    
    cd "$BACKEND_DIR"
    
    cat > setup-database.sql << 'EOF'
-- Database setup script for EC2 deployment
-- Run this script to initialize the database

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE recruitment_production'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'recruitment_production');

-- Connect to the database
\c recruitment_production;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Run all initialization scripts
\i postgres-init/01_user.sql
\i postgres-init/02_applications.sql
\i postgres-init/03_interview.sql
\i postgres-init/04_add_email_to_form_entries.sql
\i postgres-init/05_make_email_required.sql

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_created_at ON staff(created_at);
CREATE INDEX IF NOT EXISTS idx_forms_created_at ON forms(created_at);
CREATE INDEX IF NOT EXISTS idx_form_entries_submitted_at ON form_entries(submitted_at);
CREATE INDEX IF NOT EXISTS idx_form_entries_status ON form_entries(status);

-- Create database user for application (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'recruitment_app') THEN
        CREATE ROLE recruitment_app WITH LOGIN PASSWORD 'secure_app_password_change_me';
    END IF;
END
$$;

-- Grant permissions
GRANT CONNECT ON DATABASE recruitment_production TO recruitment_app;
GRANT USAGE ON SCHEMA public TO recruitment_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO recruitment_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO recruitment_app;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO recruitment_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO recruitment_app;

-- Vacuum and analyze
VACUUM ANALYZE;

-- Display summary
SELECT 
    'Database setup completed' as status,
    current_database() as database,
    current_user as user,
    now() as timestamp;
EOF
    
    log_info "✅ Database setup script created: setup-database.sql"
}

# Main function
main() {
    case "${1:-status}" in
        "production"|"prod")
            setup_production_env
            ;;
        "development"|"dev")
            setup_development_env
            ;;
        "validate")
            if [[ -n "$2" ]]; then
                validate_env "$2"
            else
                log_error "Please specify environment file to validate"
                echo "Usage: $0 validate .env.production"
                exit 1
            fi
            ;;
        "database"|"db")
            generate_db_setup
            ;;
        "status")
            show_status
            ;;
        "all")
            setup_development_env
            setup_production_env
            generate_db_setup
            show_status
            ;;
        *)
            echo "Usage: $0 [production|development|validate|database|status|all]"
            echo ""
            echo "Commands:"
            echo "  production   - Setup production environment (.env.production)"
            echo "  development  - Setup development environment (.env.local)"
            echo "  validate     - Validate environment file"
            echo "  database     - Generate database setup script"
            echo "  status       - Show environment status (default)"
            echo "  all          - Setup everything"
            echo ""
            exit 1
            ;;
    esac
}

# Check prerequisites
if ! command_exists openssl; then
    log_error "openssl is required but not installed"
    exit 1
fi

# Run main function
main "$@"