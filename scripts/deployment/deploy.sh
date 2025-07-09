#!/bin/bash

# Simple deployment wrapper script
# This script loads configuration and runs the main deployment script

set -euo pipefail

# Load configuration if it exists
if [ -f "deployment-config.env" ]; then
    source deployment-config.env
fi

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🚀 Recruitment Website Backend Deployment${NC}"
echo -e "${BLUE}=========================================${NC}"
echo

# Show current configuration
echo "Current Configuration:"
echo "- Backend Directory: ${BACKEND_DIR:-./backend}"
echo "- Environment: ${ENVIRONMENT:-production}"
echo "- AWS Region: ${AWS_REGION:-us-east-2}"
echo "- ECS Cluster: ${ECS_CLUSTER_NAME:-recruitment-backend-cluster}"
echo "- ECS Service: ${ECS_SERVICE_NAME:-recruitment-backend-service}"
echo

# Run the main deployment script
exec ./deploy-backend.sh "$@"