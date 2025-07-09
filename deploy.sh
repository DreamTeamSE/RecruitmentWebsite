#!/bin/bash

# Recruitment Website Deployment Script
# This script provides a unified interface for all deployment operations

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

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  deploy-local    Deploy for local development"
    echo "  deploy-aws      Deploy to AWS ECS"
    echo "  build          Build applications only"
    echo "  test           Run tests"
    echo "  status         Check deployment status"
    echo "  cleanup        Clean up local resources"
    echo "  help           Show this help message"
    echo ""
    echo "Options:"
    echo "  --skip-tests   Skip running tests"
    echo "  --force        Force rebuild/redeploy"
    echo "  --verbose      Enable verbose output"
    echo ""
    echo "Examples:"
    echo "  $0 deploy-local"
    echo "  $0 deploy-aws --skip-tests"
    echo "  $0 status"
    echo "  $0 cleanup"
}

# Main deployment logic
case "${1:-}" in
    "deploy-local")
        log "Starting local deployment..."
        ./scripts/deployment/deploy-local.sh "${@:2}"
        ;;
    "deploy-aws")
        log "Starting AWS deployment..."
        ./scripts/deployment/deploy-backend.sh deploy-aws "${@:2}"
        ;;
    "build")
        log "Building applications..."
        ./scripts/deployment/deploy-backend.sh build "${@:2}"
        ;;
    "test")
        log "Running tests..."
        ./scripts/testing/final-integration-test.js "${@:2}"
        ;;
    "status")
        log "Checking deployment status..."
        ./scripts/deployment/deployment-summary.sh "${@:2}"
        ;;
    "cleanup")
        log "Cleaning up local resources..."
        ./scripts/deployment/deploy-backend.sh cleanup "${@:2}"
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
