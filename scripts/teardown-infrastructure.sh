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

# Default values
ENVIRONMENT="dev"
REGION="us-east-2"
STACK_NAME="RecruitmentStack"
FORCE=false

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
        -f|--force)
            FORCE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -e, --environment ENV    Environment to destroy (dev, staging, prod) [default: dev]"
            echo "  -r, --region REGION      AWS region [default: us-east-2]"
            echo "  -f, --force             Skip confirmation prompt"
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
    
    log_success "Prerequisites check passed"
}

# Get stack status
get_stack_status() {
    aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "NOT_FOUND"
}

# List resources that will be destroyed
list_resources() {
    log_info "Resources that will be destroyed:"
    echo ""
    
    # Get stack resources
    aws cloudformation list-stack-resources --stack-name "$STACK_NAME" --region "$REGION" --query 'StackResourceSummaries[*].{Type:ResourceType,Status:ResourceStatus,LogicalId:LogicalResourceId}' --output table 2>/dev/null || {
        log_warning "Could not retrieve resource list. Stack may not exist."
        return
    }
    
    echo ""
}

# Confirm destruction
confirm_destruction() {
    if [ "$FORCE" = true ]; then
        return 0
    fi
    
    echo -e "${RED}⚠️  WARNING: This will permanently destroy all resources in the stack!${NC}"
    echo ""
    echo "Stack: $STACK_NAME"
    echo "Region: $REGION"
    echo "Environment: $ENVIRONMENT"
    echo ""
    
    read -p "Are you sure you want to continue? (yes/no): " -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Destruction cancelled"
        exit 0
    fi
}

# Clean up ECR images
cleanup_ecr() {
    log_info "Cleaning up ECR images..."
    
    # Get ECR repository name from stack outputs
    ECR_REPO_NAME=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query "Stacks[0].Outputs[?OutputKey=='ECRRepositoryUri'].OutputValue" --output text 2>/dev/null | cut -d'/' -f2)
    
    if [ -n "$ECR_REPO_NAME" ]; then
        # List and delete all images in the repository
        IMAGES=$(aws ecr list-images --repository-name "$ECR_REPO_NAME" --region "$REGION" --query 'imageIds[*]' --output json 2>/dev/null)
        
        if [ "$IMAGES" != "[]" ] && [ -n "$IMAGES" ]; then
            log_info "Deleting ECR images..."
            aws ecr batch-delete-image --repository-name "$ECR_REPO_NAME" --image-ids "$IMAGES" --region "$REGION" > /dev/null 2>&1
            log_success "ECR images deleted"
        else
            log_info "No ECR images to delete"
        fi
    else
        log_info "No ECR repository found"
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

# Build infrastructure (needed for CDK commands)
build_infrastructure() {
    log_info "Building infrastructure..."
    
    pushd "$INFRASTRUCTURE_DIR" > /dev/null
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        npm install
    fi
    
    # Build only the simple stack (skip the complex constructs)
    npx tsc --noEmit bin/simple-recruitment-app.ts lib/simple-recruitment-stack.ts --skipLibCheck
    
    popd > /dev/null
    
    log_success "Infrastructure built"
}

# Main execution
main() {
    echo "🧹 Recruitment Website Infrastructure Teardown"
    echo "Environment: $ENVIRONMENT"
    echo "Region: $REGION"
    echo ""
    
    check_prerequisites
    
    # Check if stack exists
    STACK_STATUS=$(get_stack_status)
    
    if [ "$STACK_STATUS" = "NOT_FOUND" ]; then
        log_warning "Stack $STACK_NAME not found in region $REGION"
        exit 0
    fi
    
    log_info "Stack status: $STACK_STATUS"
    
    # List resources that will be destroyed
    list_resources
    
    # Confirm destruction
    confirm_destruction
    
    # Build infrastructure (needed for CDK commands)
    build_infrastructure
    
    # Clean up ECR images first
    cleanup_ecr
    
    # Destroy infrastructure
    destroy_infrastructure
    
    echo ""
    log_success "Infrastructure teardown completed successfully!"
    echo ""
    log_info "All resources have been destroyed"
}

# Run main function
main "$@"
