#!/bin/bash

# EC2 Management Script for Recruitment Backend
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-2"}
INSTANCE_NAME="recruitment-backend-instance"
ALB_NAME="recruitment-backend-alb"
KEY_NAME=${KEY_NAME:-"recruitment-backend-key"}

# Logging functions
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

# Get instance information
get_instance_info() {
    INSTANCE_ID=$(aws ec2 describe-instances \
        --filters "Name=tag:Name,Values=$INSTANCE_NAME" "Name=instance-state-name,Values=running,stopped,stopping,pending" \
        --query 'Reservations[0].Instances[0].InstanceId' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "None")
    
    if [[ "$INSTANCE_ID" != "None" ]]; then
        INSTANCE_IP=$(aws ec2 describe-instances \
            --instance-ids $INSTANCE_ID \
            --query 'Reservations[0].Instances[0].PublicIpAddress' \
            --output text \
            --region $AWS_REGION)
        
        INSTANCE_STATE=$(aws ec2 describe-instances \
            --instance-ids $INSTANCE_ID \
            --query 'Reservations[0].Instances[0].State.Name' \
            --output text \
            --region $AWS_REGION)
    fi
}

# Start instance
start_instance() {
    log_step "Starting EC2 instance..."
    
    get_instance_info
    
    if [[ "$INSTANCE_ID" == "None" ]]; then
        log_error "No instance found with name: $INSTANCE_NAME"
        return 1
    fi
    
    if [[ "$INSTANCE_STATE" == "running" ]]; then
        log_info "Instance is already running"
        return 0
    fi
    
    aws ec2 start-instances --instance-ids $INSTANCE_ID --region $AWS_REGION
    log_info "Starting instance $INSTANCE_ID..."
    
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $AWS_REGION
    log_info "Instance is now running"
    
    # Update instance info
    get_instance_info
    log_info "Instance IP: $INSTANCE_IP"
}

# Stop instance
stop_instance() {
    log_step "Stopping EC2 instance..."
    
    get_instance_info
    
    if [[ "$INSTANCE_ID" == "None" ]]; then
        log_error "No instance found with name: $INSTANCE_NAME"
        return 1
    fi
    
    if [[ "$INSTANCE_STATE" == "stopped" ]]; then
        log_info "Instance is already stopped"
        return 0
    fi
    
    aws ec2 stop-instances --instance-ids $INSTANCE_ID --region $AWS_REGION
    log_info "Stopping instance $INSTANCE_ID..."
    
    aws ec2 wait instance-stopped --instance-ids $INSTANCE_ID --region $AWS_REGION
    log_info "Instance is now stopped"
}

# Restart instance
restart_instance() {
    log_step "Restarting EC2 instance..."
    stop_instance
    start_instance
}

# SSH into instance
ssh_instance() {
    log_step "Connecting to EC2 instance via SSH..."
    
    get_instance_info
    
    if [[ "$INSTANCE_ID" == "None" ]]; then
        log_error "No instance found with name: $INSTANCE_NAME"
        return 1
    fi
    
    if [[ "$INSTANCE_STATE" != "running" ]]; then
        log_error "Instance is not running. Current state: $INSTANCE_STATE"
        return 1
    fi
    
    if [[ ! -f "$HOME/.ssh/$KEY_NAME.pem" ]]; then
        log_error "SSH key not found: $HOME/.ssh/$KEY_NAME.pem"
        return 1
    fi
    
    log_info "Connecting to $INSTANCE_IP..."
    ssh -i "$HOME/.ssh/$KEY_NAME.pem" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        ec2-user@$INSTANCE_IP
}

# Show instance status
show_status() {
    log_step "Checking instance status..."
    
    get_instance_info
    
    if [[ "$INSTANCE_ID" == "None" ]]; then
        log_error "No instance found with name: $INSTANCE_NAME"
        return 1
    fi
    
    log_info "Instance ID: $INSTANCE_ID"
    log_info "Instance State: $INSTANCE_STATE"
    log_info "Instance IP: ${INSTANCE_IP:-'N/A'}"
    
    # Get additional details
    INSTANCE_TYPE=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --query 'Reservations[0].Instances[0].InstanceType' \
        --output text \
        --region $AWS_REGION)
    
    LAUNCH_TIME=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --query 'Reservations[0].Instances[0].LaunchTime' \
        --output text \
        --region $AWS_REGION)
    
    log_info "Instance Type: $INSTANCE_TYPE"
    log_info "Launch Time: $LAUNCH_TIME"
    
    # Check application health if running
    if [[ "$INSTANCE_STATE" == "running" && -n "$INSTANCE_IP" ]]; then
        log_info "Checking application health..."
        if curl -sf "http://$INSTANCE_IP:3000/health" >/dev/null 2>&1; then
            log_info "✅ Application: HEALTHY"
        else
            log_warn "❌ Application: UNHEALTHY"
        fi
    fi
}

# Deploy new version
deploy_update() {
    log_step "Deploying application update..."
    
    get_instance_info
    
    if [[ "$INSTANCE_ID" == "None" ]]; then
        log_error "No instance found with name: $INSTANCE_NAME"
        return 1
    fi
    
    if [[ "$INSTANCE_STATE" != "running" ]]; then
        log_error "Instance is not running. Current state: $INSTANCE_STATE"
        return 1
    fi
    
    # Build new deployment package
    BACKEND_DIR="$(dirname "$SCRIPT_DIR")/backend"
    cd "$BACKEND_DIR"
    
    log_info "Building application..."
    npm run build
    
    log_info "Creating deployment package..."
    tar -czf /tmp/backend-update.tar.gz \
        --exclude=node_modules \
        --exclude=coverage \
        --exclude=.git \
        dist package.json package-lock.json docker-compose.production.yml
    
    # Deploy to instance
    log_info "Uploading to instance..."
    scp -i "$HOME/.ssh/$KEY_NAME.pem" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        /tmp/backend-update.tar.gz \
        ec2-user@$INSTANCE_IP:/tmp/
    
    # Update on instance
    ssh -i "$HOME/.ssh/$KEY_NAME.pem" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        ec2-user@$INSTANCE_IP << 'SSH_EOF'
cd /opt/recruitment-backend

# Stop services
docker-compose -f docker-compose.production.yml down

# Backup current version
mv dist dist.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Extract new version
tar -xzf /tmp/backend-update.tar.gz

# Restart services
docker-compose -f docker-compose.production.yml up -d

# Wait for health check
sleep 30
curl -f http://localhost:3000/health || echo "Health check failed"

# Clean up
rm /tmp/backend-update.tar.gz
SSH_EOF
    
    rm -f /tmp/backend-update.tar.gz
    log_info "Deployment completed"
}

# Show logs
show_logs() {
    log_step "Fetching application logs..."
    
    get_instance_info
    
    if [[ "$INSTANCE_ID" == "None" ]]; then
        log_error "No instance found with name: $INSTANCE_NAME"
        return 1
    fi
    
    if [[ "$INSTANCE_STATE" != "running" ]]; then
        log_error "Instance is not running. Current state: $INSTANCE_STATE"
        return 1
    fi
    
    ssh -i "$HOME/.ssh/$KEY_NAME.pem" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        ec2-user@$INSTANCE_IP \
        "cd /opt/recruitment-backend && docker-compose -f docker-compose.production.yml logs --tail=50 app"
}

# Show costs
show_costs() {
    log_step "Calculating EC2 costs..."
    
    get_instance_info
    
    if [[ "$INSTANCE_ID" == "None" ]]; then
        log_error "No instance found with name: $INSTANCE_NAME"
        return 1
    fi
    
    # Get instance details for cost calculation
    INSTANCE_TYPE=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --query 'Reservations[0].Instances[0].InstanceType' \
        --output text \
        --region $AWS_REGION)
    
    LAUNCH_TIME=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --query 'Reservations[0].Instances[0].LaunchTime' \
        --output text \
        --region $AWS_REGION)
    
    log_info "Instance Type: $INSTANCE_TYPE"
    log_info "Launch Time: $LAUNCH_TIME"
    log_info "Region: $AWS_REGION"
    
    # Note: Actual cost calculation would require AWS Cost Explorer API
    log_warn "For detailed cost analysis, check AWS Cost Explorer or AWS Billing dashboard"
    log_info "Estimated monthly cost for $INSTANCE_TYPE in $AWS_REGION:"
    
    case $INSTANCE_TYPE in
        "t3.micro")
            log_info "  ~$8-12/month"
            ;;
        "t3.small")
            log_info "  ~$15-20/month"
            ;;
        "t3.medium")
            log_info "  ~$30-40/month"
            ;;
        *)
            log_info "  Check AWS pricing calculator"
            ;;
    esac
}

# Cleanup resources
cleanup() {
    log_step "Cleaning up AWS resources..."
    
    log_warn "This will delete ALL recruitment backend resources!"
    read -p "Are you sure? Type 'delete' to confirm: " confirm
    
    if [[ "$confirm" != "delete" ]]; then
        log_info "Cleanup cancelled"
        return 0
    fi
    
    get_instance_info
    
    # Terminate instance
    if [[ "$INSTANCE_ID" != "None" ]]; then
        log_info "Terminating instance $INSTANCE_ID..."
        aws ec2 terminate-instances --instance-ids $INSTANCE_ID --region $AWS_REGION
        
        log_info "Waiting for instance to terminate..."
        aws ec2 wait instance-terminated --instance-ids $INSTANCE_ID --region $AWS_REGION
    fi
    
    # Delete load balancer
    ALB_ARN=$(aws elbv2 describe-load-balancers \
        --names $ALB_NAME \
        --query 'LoadBalancers[0].LoadBalancerArn' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "None")
    
    if [[ "$ALB_ARN" != "None" ]]; then
        log_info "Deleting load balancer..."
        aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN --region $AWS_REGION
    fi
    
    # Delete target group
    TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
        --names "recruitment-backend-targets" \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "None")
    
    if [[ "$TARGET_GROUP_ARN" != "None" ]]; then
        log_info "Deleting target group..."
        aws elbv2 delete-target-group --target-group-arn $TARGET_GROUP_ARN --region $AWS_REGION
    fi
    
    # Delete security group
    SECURITY_GROUP_ID=$(aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=recruitment-backend-sg" \
        --query 'SecurityGroups[0].GroupId' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "None")
    
    if [[ "$SECURITY_GROUP_ID" != "None" ]]; then
        log_info "Deleting security group..."
        aws ec2 delete-security-group --group-id $SECURITY_GROUP_ID --region $AWS_REGION
    fi
    
    # Delete key pair
    EXISTING_KEY=$(aws ec2 describe-key-pairs \
        --key-names $KEY_NAME \
        --query 'KeyPairs[0].KeyName' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "None")
    
    if [[ "$EXISTING_KEY" != "None" ]]; then
        log_info "Deleting key pair..."
        aws ec2 delete-key-pair --key-name $KEY_NAME --region $AWS_REGION
        rm -f "$HOME/.ssh/$KEY_NAME.pem"
    fi
    
    log_info "Cleanup completed"
}

# Main function
main() {
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    case ${1:-"status"} in
        "start")
            start_instance
            ;;
        "stop")
            stop_instance
            ;;
        "restart")
            restart_instance
            ;;
        "status")
            show_status
            ;;
        "ssh")
            ssh_instance
            ;;
        "deploy")
            deploy_update
            ;;
        "logs")
            show_logs
            ;;
        "costs")
            show_costs
            ;;
        "cleanup")
            cleanup
            ;;
        *)
            echo "Usage: $0 [start|stop|restart|status|ssh|deploy|logs|costs|cleanup]"
            echo ""
            echo "Commands:"
            echo "  start    - Start the EC2 instance"
            echo "  stop     - Stop the EC2 instance"
            echo "  restart  - Restart the EC2 instance"
            echo "  status   - Show instance status (default)"
            echo "  ssh      - SSH into the instance"
            echo "  deploy   - Deploy application update"
            echo "  logs     - Show application logs"
            echo "  costs    - Show cost estimates"
            echo "  cleanup  - Delete all resources (DESTRUCTIVE)"
            echo ""
            exit 1
            ;;
    esac
}

# Run main function
main "$@"