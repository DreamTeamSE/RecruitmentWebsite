#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INFRASTRUCTURE_DIR="$PROJECT_ROOT/infrastructure"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Default values
ENVIRONMENT="dev"
REGION="us-east-2"
BOOTSTRAP_ONLY=false
DESTROY=false
SKIP_BACKEND_BUILD=false
STACK_NAME="RecruitmentStack"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        --bootstrap-only)
            BOOTSTRAP_ONLY=true
            shift
            ;;
        --destroy)
            DESTROY=true
            shift
            ;;
        --skip-backend-build)
            SKIP_BACKEND_BUILD=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -e, --environment ENV    Environment to deploy (dev, staging, prod) [default: dev]"
            echo "  -r, --region REGION      AWS region [default: us-east-2]"
            echo "  --bootstrap-only         Only bootstrap CDK, don't deploy"
            echo "  --destroy                Destroy the stack instead of deploying"
            echo "  --skip-backend-build     Skip backend Docker build and push"
            echo "  -h, --help              Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

# Utility functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    # Check Docker (only if not skipping backend build)
    if [ "$SKIP_BACKEND_BUILD" = false ]; then
        if ! command -v docker &> /dev/null; then
            log_error "Docker not found. Please install it first."
            exit 1
        fi
        
        if ! docker info &> /dev/null; then
            log_error "Docker daemon not running"
            exit 1
        fi
    fi
    
    # Check Node.js and npm
    if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
        log_error "Node.js and npm are required"
        exit 1
    fi
    
    # Check infrastructure directory
    if [ ! -d "$INFRASTRUCTURE_DIR" ]; then
        log_error "Infrastructure directory not found: $INFRASTRUCTURE_DIR"
        exit 1
    fi
    
    # Check backend directory (only if not skipping backend build)
    if [ "$SKIP_BACKEND_BUILD" = false ] && [ ! -d "$BACKEND_DIR" ]; then
        log_error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing infrastructure dependencies..."
    
    pushd "$INFRASTRUCTURE_DIR" > /dev/null
    
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        npm install
    fi
    
    popd > /dev/null
    
    log_success "Dependencies installed"
}

# Build infrastructure
build_infrastructure() {
    log_info "Building infrastructure..."
    
    pushd "$INFRASTRUCTURE_DIR" > /dev/null
    
    # Build only the simple stack (skip the complex constructs)
    npx tsc --noEmit bin/simple-recruitment-app.ts lib/simple-recruitment-stack.ts --skipLibCheck
    
    popd > /dev/null
    
    log_success "Infrastructure built"
}

# Bootstrap CDK
bootstrap_cdk() {
    log_info "Bootstrapping CDK in region $REGION..."
    
    pushd "$INFRASTRUCTURE_DIR" > /dev/null
    
    # Use the simple app
    export CDK_APP="npx ts-node --prefer-ts-exts bin/simple-recruitment-app.ts"
    
    AWS_REGION="$REGION" npx cdk bootstrap --app "$CDK_APP"
    
    popd > /dev/null
    
    log_success "CDK bootstrapped"
}

# Build and push backend Docker image
build_and_push_backend() {
    if [ "$SKIP_BACKEND_BUILD" = true ]; then
        log_warning "Skipping backend build as requested"
        return
    fi
    
    log_info "Building and pushing backend Docker image..."
    
    # Get ECR repository URI from CDK outputs
    ECR_URI=$(get_stack_output "ECRRepositoryUri")
    
    if [ -z "$ECR_URI" ]; then
        log_error "Could not get ECR repository URI. Stack may not be deployed yet."
        log_info "Deploying infrastructure first to create ECR repository..."
        deploy_infrastructure
        ECR_URI=$(get_stack_output "ECRRepositoryUri")
    fi
    
    # Login to ECR
    aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_URI"
    
    # Build and push image
    pushd "$BACKEND_DIR" > /dev/null
    
    log_info "Building Docker image..."
    docker build -t recruitment-backend .
    
    log_info "Tagging image..."
    docker tag recruitment-backend:latest "$ECR_URI:latest"
    
    log_info "Pushing image to ECR..."
    docker push "$ECR_URI:latest"
    
    popd > /dev/null
    
    log_success "Backend image built and pushed"
}

# Get stack output
get_stack_output() {
    local output_key="$1"
    pushd "$INFRASTRUCTURE_DIR" > /dev/null
    
    # Use the simple app
    export CDK_APP="npx ts-node --prefer-ts-exts bin/simple-recruitment-app.ts"
    
    AWS_REGION="$REGION" npx cdk list --json --app "$CDK_APP" 2>/dev/null | jq -r ".[0]" | xargs -I {} aws cloudformation describe-stacks --stack-name {} --region "$REGION" --query "Stacks[0].Outputs[?OutputKey=='$output_key'].OutputValue" --output text 2>/dev/null || echo ""
    popd > /dev/null
}

# Deploy infrastructure
deploy_infrastructure() {
    log_info "Deploying infrastructure stack..."
    
    pushd "$INFRASTRUCTURE_DIR" > /dev/null
    
    # Set environment variables
    export CDK_DEFAULT_REGION="$REGION"
    
    # Use the simple app instead of the complex one
    export CDK_APP="npx ts-node --prefer-ts-exts bin/simple-recruitment-app.ts"
    
    # Deploy the stack
    AWS_REGION="$REGION" npx cdk deploy "$STACK_NAME" --require-approval never --app "$CDK_APP"
    
    popd > /dev/null
    
    log_success "Infrastructure deployed"
}

# Update ECS service with new image
update_ecs_service() {
    if [ "$SKIP_BACKEND_BUILD" = true ]; then
        log_warning "Skipping ECS service update as backend build was skipped"
        return
    fi
    
    log_info "Updating ECS service with new backend image..."
    
    # Get outputs from CDK
    ECR_URI=$(get_stack_output "ECRRepositoryUri")
    
    if [ -z "$ECR_URI" ]; then
        log_error "Could not get ECR repository URI from stack outputs"
        return
    fi
    
    # Update the task definition to use the new image
    # This would require updating the CDK stack or using AWS CLI
    # For now, we'll force a new deployment of the service
    
    # Get cluster and service names from the stack
    CLUSTER_NAME=$(aws ecs list-clusters --region "$REGION" --query 'clusterArns[0]' --output text | xargs basename)
    SERVICE_NAME=$(aws ecs list-services --cluster "$CLUSTER_NAME" --region "$REGION" --query 'serviceArns[0]' --output text | xargs basename)
    
    if [ -n "$CLUSTER_NAME" ] && [ -n "$SERVICE_NAME" ]; then
        log_info "Forcing new deployment of ECS service..."
        aws ecs update-service --cluster "$CLUSTER_NAME" --service "$SERVICE_NAME" --force-new-deployment --region "$REGION" > /dev/null
        
        log_info "Waiting for service to stabilize..."
        aws ecs wait services-stable --cluster "$CLUSTER_NAME" --services "$SERVICE_NAME" --region "$REGION"
        
        log_success "ECS service updated"
    else
        log_warning "Could not find ECS cluster or service to update"
    fi
}

# Destroy infrastructure
destroy_infrastructure() {
    log_warning "Destroying infrastructure stack..."
    
    pushd "$INFRASTRUCTURE_DIR" > /dev/null
    
    # Set environment variables
    export CDK_DEFAULT_REGION="$REGION"
    
    # Use the simple app
    export CDK_APP="npx ts-node --prefer-ts-exts bin/simple-recruitment-app.ts"
    
    # Destroy the stack
    AWS_REGION="$REGION" npx cdk destroy "$STACK_NAME" --force --app "$CDK_APP"
    
    popd > /dev/null
    
    log_success "Infrastructure destroyed"
}

# Show deployment summary
show_summary() {
    log_info "Deployment Summary:"
    echo ""
    
    # Get outputs from CDK
    VPC_ID=$(get_stack_output "VpcId")
    DB_ENDPOINT=$(get_stack_output "DatabaseEndpoint")
    LB_URL=$(get_stack_output "LoadBalancerUrl")
    ECR_URI=$(get_stack_output "ECRRepositoryUri")
    ASSETS_BUCKET=$(get_stack_output "AssetsBucketName")
    FRONTEND_URL=$(get_stack_output "FrontendUrl")
    
    echo "📦 Stack: $STACK_NAME"
    echo "🌍 Region: $REGION"
    echo "🏗️  Environment: $ENVIRONMENT"
    echo ""
    [ -n "$VPC_ID" ] && echo "🌐 VPC ID: $VPC_ID"
    [ -n "$DB_ENDPOINT" ] && echo "🗄️  Database Endpoint: $DB_ENDPOINT"
    [ -n "$LB_URL" ] && echo "⚖️  Load Balancer URL: $LB_URL"
    [ -n "$ECR_URI" ] && echo "🐳 ECR Repository: $ECR_URI"
    [ -n "$ASSETS_BUCKET" ] && echo "📁 Assets Bucket: $ASSETS_BUCKET"
    [ -n "$FRONTEND_URL" ] && echo "🌐 Frontend URL: $FRONTEND_URL"
    echo ""
    
    if [ -n "$LB_URL" ]; then
        echo "🚀 Backend API available at: $LB_URL"
    fi
    
    if [ -n "$FRONTEND_URL" ]; then
        echo "🎨 Frontend available at: $FRONTEND_URL"
    fi
}

# Main execution
main() {
    echo "🚀 Recruitment Website Infrastructure Deployment"
    echo "Environment: $ENVIRONMENT"
    echo "Region: $REGION"
    echo ""
    
    check_prerequisites
    
    if [ "$DESTROY" = true ]; then
        destroy_infrastructure
        exit 0
    fi
    
    install_dependencies
    build_infrastructure
    bootstrap_cdk
    
    if [ "$BOOTSTRAP_ONLY" = true ]; then
        log_success "Bootstrap completed"
        exit 0
    fi
    
    deploy_infrastructure
    build_and_push_backend
    update_ecs_service
    
    echo ""
    log_success "Deployment completed successfully!"
    echo ""
    show_summary
}

# Run main function
main "$@"
