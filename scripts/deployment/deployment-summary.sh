#!/bin/bash

# Deployment Summary Script
# Shows the current status of all deployment components

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Recruitment Website Deployment Summary${NC}"
echo -e "${BLUE}=========================================${NC}"
echo

# Check production health
echo -e "${GREEN}📊 Production Health Status:${NC}"
if curl -f https://d2oc9fk5wyihzt.cloudfront.net/health >/dev/null 2>&1; then
    echo -e "✅ Backend API: ${GREEN}HEALTHY${NC}"
else
    echo -e "❌ Backend API: ${RED}UNHEALTHY${NC}"
fi

if curl -f https://main.d1d64zijwu2pjz.amplifyapp.com >/dev/null 2>&1; then
    echo -e "✅ Frontend: ${GREEN}HEALTHY${NC}"
else
    echo -e "❌ Frontend: ${RED}UNHEALTHY${NC}"
fi

echo

# Show AWS ECS Status
echo -e "${GREEN}🔧 AWS ECS Status:${NC}"
aws ecs describe-services \
    --cluster recruitment-backend-cluster \
    --services recruitment-backend-service \
    --region us-east-2 \
    --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount,PendingCount:pendingCount,TaskDefinition:taskDefinition}' \
    --output table

echo

# Show production URLs
echo -e "${GREEN}🌐 Production URLs:${NC}"
echo "• Backend API: https://d2oc9fk5wyihzt.cloudfront.net"
echo "• Health Check: https://d2oc9fk5wyihzt.cloudfront.net/health"
echo "• Frontend: https://main.d1d64zijwu2pjz.amplifyapp.com"

echo

# Show deployment scripts
echo -e "${GREEN}🛠 Available Deployment Scripts:${NC}"
echo "• ./deploy.sh deploy-aws       - Deploy to AWS"
echo "• ./deploy.sh deploy-local     - Deploy locally"
echo "• ./deploy.sh status aws       - Check AWS status"
echo "• ./deploy.sh health <url>     - Check health"
echo "• ./deploy.sh help             - Show help"

echo

# Show quick deployment command
echo -e "${YELLOW}🚀 Quick Deployment Command:${NC}"
echo "   ./deploy.sh deploy-aws"

echo
echo -e "${GREEN}✅ Deployment system is ready!${NC}"