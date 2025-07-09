#!/bin/bash

# =============================================================================
# Backend Deployment Script for Recruitment Website
# =============================================================================
# This script provides a complete deployment solution for the backend server
# with support for local development, Docker, and AWS ECS deployment.
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
BACKEND_DIR="./backend"
DOCKER_IMAGE_NAME="recruitment-backend"
AWS_REGION="us-east-2"
AWS_ACCOUNT_ID=""
ECR_REPOSITORY_NAME="recruitment-backend"
ECS_CLUSTER_NAME="recruitment-backend-cluster"
ECS_SERVICE_NAME="recruitment-backend-service"
ENVIRONMENT="production"

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if backend directory exists
    if [ ! -d "$BACKEND_DIR" ]; then
        error "Backend directory not found at $BACKEND_DIR"
        exit 1
    fi
    
    # Check if package.json exists
    if [ ! -f "$BACKEND_DIR/package.json" ]; then
        error "package.json not found in $BACKEND_DIR"
        exit 1
    fi
    
    # Check if Docker is installed
    if ! command_exists docker; then
        error "Docker is not installed. Please install Docker to continue."
        exit 1
    fi
    
    # Check if AWS CLI is installed for AWS deployment
    if [[ "${1:-}" == "aws" ]] && ! command_exists aws; then
        error "AWS CLI is not installed. Please install AWS CLI for AWS deployment."
        exit 1
    fi
    
    log "Prerequisites check passed ✓"
}

# Function to setup environment variables
setup_environment() {
    log "Setting up environment variables..."
    
    # Create .env.production if it doesn't exist
    if [ ! -f "$BACKEND_DIR/.env.production" ]; then
        if [ -f "$BACKEND_DIR/.env.template" ]; then
            cp "$BACKEND_DIR/.env.template" "$BACKEND_DIR/.env.production"
            info "Created .env.production from template"
        else
            cat > "$BACKEND_DIR/.env.production" << EOF
# Production Environment Variables
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://admin:password@localhost:5432/recruitment_db
JWT_SECRET=your-jwt-secret-key
CORS_ORIGIN=https://your-frontend-domain.com
LOG_LEVEL=info

# SMTP Configuration (Email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@dreamteameng.org
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@dreamteameng.org
FRONTEND_URL=https://your-frontend-domain.com
EOF
            info "Created default .env.production file"
        fi
        
        warning "Please edit $BACKEND_DIR/.env.production with your actual values"
        read -p "Press Enter to continue after editing the environment file..."
    fi
    
    log "Environment setup completed ✓"
}

# Function to build the application
build_application() {
    log "Building TypeScript application..."
    
    cd "$BACKEND_DIR"
    
    # Install dependencies
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    # Build TypeScript
    npm run build
    
    # Check if build was successful
    if [ ! -d "dist" ]; then
        error "Build failed - dist directory not found"
        exit 1
    fi
    
    log "Application build completed ✓"
    cd ..
}

# Function to run tests
run_tests() {
    log "Running tests..."
    
    cd "$BACKEND_DIR"
    
    # Run tests if test script exists
    if npm run test --silent 2>/dev/null; then
        log "Tests passed ✓"
    else
        warning "Tests not found or failed - continuing with deployment"
    fi
    
    cd ..
}

# Function to build Docker image
build_docker_image() {
    log "Building Docker image..."
    
    # Build for the correct platform (AMD64 for AWS ECS)
    docker build --platform linux/amd64 -t "$DOCKER_IMAGE_NAME:latest" "$BACKEND_DIR"
    
    # Test the image
    log "Testing Docker image..."
    if docker run --rm "$DOCKER_IMAGE_NAME:latest" node --version >/dev/null 2>&1; then
        log "Docker image test passed ✓"
    else
        error "Docker image test failed"
        exit 1
    fi
    
    log "Docker image build completed ✓"
}

# Function to deploy to local Docker
deploy_local() {
    log "Deploying to local Docker environment..."
    
    # Stop existing container if running
    if docker ps -a --format 'table {{.Names}}' | grep -q "^recruitment-backend$"; then
        docker stop recruitment-backend >/dev/null 2>&1 || true
        docker rm recruitment-backend >/dev/null 2>&1 || true
    fi
    
    # Run the container
    docker run -d \
        --name recruitment-backend \
        --env-file "$BACKEND_DIR/.env.production" \
        -p 3000:3000 \
        "$DOCKER_IMAGE_NAME:latest"
    
    # Wait for container to start
    sleep 5
    
    # Test the deployment
    if curl -f http://localhost:3000/health >/dev/null 2>&1; then
        log "Local deployment successful ✓"
        info "Backend is running at http://localhost:3000"
    else
        error "Local deployment failed - health check failed"
        docker logs recruitment-backend
        exit 1
    fi
}

# Function to get AWS account ID
get_aws_account_id() {
    if [ -z "$AWS_ACCOUNT_ID" ]; then
        AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        if [ -z "$AWS_ACCOUNT_ID" ]; then
            error "Could not get AWS account ID"
            exit 1
        fi
    fi
}

# Function to login to ECR
ecr_login() {
    log "Logging into AWS ECR..."
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
    log "ECR login successful ✓"
}

# Function to push to ECR
push_to_ecr() {
    log "Pushing Docker image to ECR..."
    
    get_aws_account_id
    ecr_login
    
    # Tag the image
    docker tag "$DOCKER_IMAGE_NAME:latest" "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_NAME:latest"
    
    # Push the image
    docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_NAME:latest"
    
    log "Image pushed to ECR successfully ✓"
}

# Function to deploy to AWS ECS
deploy_aws() {
    log "Deploying to AWS ECS..."
    
    # Push to ECR first
    push_to_ecr
    
    # Force new deployment
    aws ecs update-service \
        --cluster "$ECS_CLUSTER_NAME" \
        --service "$ECS_SERVICE_NAME" \
        --force-new-deployment \
        --region "$AWS_REGION" \
        >/dev/null
    
    log "ECS deployment initiated ✓"
    
    # Wait for deployment to stabilize
    log "Waiting for deployment to stabilize..."
    aws ecs wait services-stable \
        --cluster "$ECS_CLUSTER_NAME" \
        --services "$ECS_SERVICE_NAME" \
        --region "$AWS_REGION"
    
    log "AWS ECS deployment completed ✓"
}

# Function to check deployment health
check_health() {
    local url="$1"
    log "Checking deployment health at $url..."
    
    for i in {1..30}; do
        if curl -f "$url/health" >/dev/null 2>&1; then
            log "Health check passed ✓"
            return 0
        fi
        sleep 2
    done
    
    error "Health check failed after 60 seconds"
    return 1
}

# Function to show deployment status
show_status() {
    if [[ "${1:-}" == "aws" ]]; then
        log "Checking AWS ECS service status..."
        aws ecs describe-services \
            --cluster "$ECS_CLUSTER_NAME" \
            --services "$ECS_SERVICE_NAME" \
            --region "$AWS_REGION" \
            --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount,PendingCount:pendingCount}' \
            --output table
    else
        log "Checking local Docker status..."
        docker ps --filter name=recruitment-backend --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    fi
}

# Function to show logs
show_logs() {
    if [[ "${1:-}" == "aws" ]]; then
        log "Fetching AWS ECS logs..."
        # This would require additional setup with CloudWatch logs
        info "AWS logs can be viewed in CloudWatch console"
    else
        log "Showing local Docker logs..."
        docker logs recruitment-backend --tail 50
    fi
}

# Function to cleanup
cleanup() {
    log "Cleaning up..."
    
    # Remove Docker images
    if [[ "${1:-}" == "all" ]]; then
        docker rmi "$DOCKER_IMAGE_NAME:latest" 2>/dev/null || true
        if [ -n "$AWS_ACCOUNT_ID" ]; then
            docker rmi "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_NAME:latest" 2>/dev/null || true
        fi
    fi
    
    # Stop local container
    docker stop recruitment-backend 2>/dev/null || true
    docker rm recruitment-backend 2>/dev/null || true
    
    log "Cleanup completed ✓"
}

# Function to show help
show_help() {
    cat << EOF
Backend Deployment Script for Recruitment Website

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    build           Build the application and Docker image
    deploy-local    Deploy to local Docker environment
    deploy-aws      Deploy to AWS ECS
    status          Show deployment status
    logs            Show deployment logs
    health          Check deployment health
    cleanup         Clean up Docker resources
    help            Show this help message

Options:
    --backend-dir DIR       Backend directory (default: ./backend)
    --image-name NAME       Docker image name (default: recruitment-backend)
    --aws-region REGION     AWS region (default: us-east-2)
    --cluster-name NAME     ECS cluster name (default: recruitment-backend-cluster)
    --service-name NAME     ECS service name (default: recruitment-backend-service)
    --environment ENV       Environment (default: production)

Examples:
    $0 build                           # Build application and Docker image
    $0 deploy-local                    # Deploy locally
    $0 deploy-aws                      # Deploy to AWS ECS
    $0 status aws                      # Check AWS deployment status
    $0 logs local                      # Show local Docker logs
    $0 health https://api.example.com  # Check health of remote deployment
    $0 cleanup all                     # Clean up all Docker resources

Environment Variables:
    Set these in $BACKEND_DIR/.env.production:
    - NODE_ENV=production
    - PORT=3000
    - DATABASE_URL=postgresql://...
    - JWT_SECRET=your-secret
    - CORS_ORIGIN=https://your-frontend.com

Prerequisites:
    - Docker installed
    - AWS CLI configured (for AWS deployment)
    - Backend directory with package.json
    - Environment variables configured

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --backend-dir)
            BACKEND_DIR="$2"
            shift 2
            ;;
        --image-name)
            DOCKER_IMAGE_NAME="$2"
            shift 2
            ;;
        --aws-region)
            AWS_REGION="$2"
            shift 2
            ;;
        --cluster-name)
            ECS_CLUSTER_NAME="$2"
            shift 2
            ;;
        --service-name)
            ECS_SERVICE_NAME="$2"
            shift 2
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        *)
            break
            ;;
    esac
done

# Main script logic
main() {
    local command="${1:-help}"
    
    case "$command" in
        build)
            check_prerequisites
            setup_environment
            build_application
            run_tests
            build_docker_image
            ;;
        deploy-local)
            check_prerequisites
            setup_environment
            build_application
            build_docker_image
            deploy_local
            ;;
        deploy-aws)
            check_prerequisites aws
            setup_environment
            build_application
            build_docker_image
            deploy_aws
            ;;
        status)
            show_status "${2:-local}"
            ;;
        logs)
            show_logs "${2:-local}"
            ;;
        health)
            check_health "${2:-http://localhost:3000}"
            ;;
        cleanup)
            cleanup "${2:-}"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"