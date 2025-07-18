#!/bin/bash

# EC2 Monitoring and Health Check Script
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
        --filters "Name=tag:Name,Values=$INSTANCE_NAME" "Name=instance-state-name,Values=running" \
        --query 'Reservations[0].Instances[0].InstanceId' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "None")
    
    if [[ "$INSTANCE_ID" == "None" ]]; then
        log_error "No running instance found with name: $INSTANCE_NAME"
        return 1
    fi
    
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
}

# Get load balancer information
get_alb_info() {
    ALB_DNS=$(aws elbv2 describe-load-balancers \
        --names $ALB_NAME \
        --query 'LoadBalancers[0].DNSName' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "None")
    
    if [[ "$ALB_DNS" != "None" ]]; then
        ALB_STATE=$(aws elbv2 describe-load-balancers \
            --names $ALB_NAME \
            --query 'LoadBalancers[0].State.Code' \
            --output text \
            --region $AWS_REGION)
    fi
}

# Check instance health
check_instance_health() {
    log_step "Checking EC2 instance health..."
    
    get_instance_info
    
    if [[ "$INSTANCE_ID" == "None" ]]; then
        return 1
    fi
    
    log_info "Instance ID: $INSTANCE_ID"
    log_info "Instance IP: $INSTANCE_IP"
    log_info "Instance State: $INSTANCE_STATE"
    
    # Check instance status
    INSTANCE_STATUS=$(aws ec2 describe-instance-status \
        --instance-ids $INSTANCE_ID \
        --query 'InstanceStatuses[0].InstanceStatus.Status' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "unknown")
    
    SYSTEM_STATUS=$(aws ec2 describe-instance-status \
        --instance-ids $INSTANCE_ID \
        --query 'InstanceStatuses[0].SystemStatus.Status' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "unknown")
    
    log_info "Instance Status: $INSTANCE_STATUS"
    log_info "System Status: $SYSTEM_STATUS"
    
    # Check if application is responding
    if curl -sf "http://$INSTANCE_IP:3000/health" >/dev/null 2>&1; then
        log_info "✅ Application health check: PASSED"
        
        # Get detailed health info
        HEALTH_RESPONSE=$(curl -s "http://$INSTANCE_IP:3000/health" | jq -r '.status' 2>/dev/null || echo "unknown")
        log_info "Application Status: $HEALTH_RESPONSE"
    else
        log_error "❌ Application health check: FAILED"
        return 1
    fi
}

# Check load balancer health
check_alb_health() {
    log_step "Checking Application Load Balancer health..."
    
    get_alb_info
    
    if [[ "$ALB_DNS" == "None" ]]; then
        log_warn "No load balancer found with name: $ALB_NAME"
        return 0
    fi
    
    log_info "ALB DNS: $ALB_DNS"
    log_info "ALB State: $ALB_STATE"
    
    # Check ALB health
    if curl -sf "http://$ALB_DNS/health" >/dev/null 2>&1; then
        log_info "✅ Load balancer health check: PASSED"
    else
        log_error "❌ Load balancer health check: FAILED"
        
        # Check target group health
        TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
            --names "recruitment-backend-targets" \
            --query 'TargetGroups[0].TargetGroupArn' \
            --output text \
            --region $AWS_REGION 2>/dev/null || echo "None")
        
        if [[ "$TARGET_GROUP_ARN" != "None" ]]; then
            log_info "Checking target group health..."
            TARGET_HEALTH=$(aws elbv2 describe-target-health \
                --target-group-arn $TARGET_GROUP_ARN \
                --region $AWS_REGION)
            
            echo "$TARGET_HEALTH" | jq -r '.TargetHealthDescriptions[] | "Target: \(.Target.Id) Port: \(.Target.Port) Health: \(.TargetHealth.State)"'
        fi
        
        return 1
    fi
}

# Check CloudWatch metrics
check_cloudwatch_metrics() {
    log_step "Checking CloudWatch metrics..."
    
    # Get CPU utilization
    CPU_UTILIZATION=$(aws cloudwatch get-metric-statistics \
        --namespace "AWS/EC2" \
        --metric-name "CPUUtilization" \
        --dimensions Name=InstanceId,Value=$INSTANCE_ID \
        --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
        --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
        --period 300 \
        --statistics Average \
        --region $AWS_REGION \
        --query 'Datapoints[0].Average' \
        --output text 2>/dev/null || echo "None")
    
    if [[ "$CPU_UTILIZATION" != "None" ]]; then
        log_info "CPU Utilization: ${CPU_UTILIZATION}%"
        
        # Check if CPU is too high
        if (( $(echo "$CPU_UTILIZATION > 80" | bc -l) )); then
            log_warn "High CPU utilization detected!"
        fi
    else
        log_warn "No recent CPU metrics available"
    fi
    
    # Get status check failures
    STATUS_CHECK_FAILURES=$(aws cloudwatch get-metric-statistics \
        --namespace "AWS/EC2" \
        --metric-name "StatusCheckFailed" \
        --dimensions Name=InstanceId,Value=$INSTANCE_ID \
        --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
        --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
        --period 300 \
        --statistics Sum \
        --region $AWS_REGION \
        --query 'Datapoints[0].Sum' \
        --output text 2>/dev/null || echo "None")
    
    if [[ "$STATUS_CHECK_FAILURES" != "None" ]] && [[ "$STATUS_CHECK_FAILURES" != "0" ]]; then
        log_warn "Status check failures detected: $STATUS_CHECK_FAILURES"
    fi
}

# Check application logs
check_application_logs() {
    log_step "Checking recent application logs..."
    
    # Check if we can SSH to the instance
    if [[ -f "$HOME/.ssh/recruitment-backend-key.pem" ]]; then
        log_info "Fetching recent application logs..."
        
        ssh -i "$HOME/.ssh/recruitment-backend-key.pem" \
            -o StrictHostKeyChecking=no \
            -o UserKnownHostsFile=/dev/null \
            -o ConnectTimeout=10 \
            ec2-user@$INSTANCE_IP \
            "cd /opt/recruitment-backend && docker-compose -f docker-compose.production.yml logs --tail=20 app" 2>/dev/null || {
            log_warn "Could not fetch application logs via SSH"
        }
    else
        log_warn "SSH key not found. Cannot fetch application logs."
    fi
}

# Generate health report
generate_health_report() {
    log_step "Generating health report..."
    
    TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
    REPORT_FILE="/tmp/recruitment-backend-health-$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$REPORT_FILE" << EOF
========================================
Recruitment Backend Health Report
Generated: $TIMESTAMP
========================================

EC2 Instance Information:
- Instance ID: $INSTANCE_ID
- Instance IP: $INSTANCE_IP
- Instance State: $INSTANCE_STATE
- Instance Status: $INSTANCE_STATUS
- System Status: $SYSTEM_STATUS

Load Balancer Information:
- ALB DNS: $ALB_DNS
- ALB State: $ALB_STATE

Performance Metrics:
- CPU Utilization: $CPU_UTILIZATION%
- Status Check Failures: $STATUS_CHECK_FAILURES

Application Health:
$(curl -s "http://$INSTANCE_IP:3000/health" 2>/dev/null | jq . || echo "Health endpoint not accessible")

Recent Errors (if any):
$(aws logs filter-log-events \
    --log-group-name "/aws/ec2/recruitment-backend" \
    --start-time $(($(date +%s) - 3600))000 \
    --filter-pattern "ERROR" \
    --region $AWS_REGION \
    --query 'events[*].message' \
    --output text 2>/dev/null | head -10 || echo "No recent errors found")

========================================
EOF
    
    log_info "Health report saved to: $REPORT_FILE"
    
    # Display summary
    echo ""
    log_info "=== HEALTH SUMMARY ==="
    if check_instance_health && check_alb_health; then
        log_info "✅ Overall Status: HEALTHY"
    else
        log_error "❌ Overall Status: UNHEALTHY"
    fi
}

# Restart services if needed
restart_services() {
    log_step "Restarting application services..."
    
    if [[ -f "$HOME/.ssh/recruitment-backend-key.pem" ]]; then
        ssh -i "$HOME/.ssh/recruitment-backend-key.pem" \
            -o StrictHostKeyChecking=no \
            -o UserKnownHostsFile=/dev/null \
            ec2-user@$INSTANCE_IP << 'SSH_EOF'
cd /opt/recruitment-backend

# Restart Docker containers
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d

# Restart systemd service
sudo systemctl restart recruitment-backend

# Wait for services to be ready
sleep 30

# Check health
curl -f http://localhost:3000/health || echo "Health check failed after restart"
SSH_EOF
        
        log_info "Services restarted"
    else
        log_error "Cannot restart services: SSH key not found"
    fi
}

# Main function
main() {
    case ${1:-"check"} in
        "check"|"health")
            log_info "🔍 Checking recruitment backend health..."
            check_instance_health
            check_alb_health
            check_cloudwatch_metrics
            ;;
        "logs")
            log_info "📋 Checking application logs..."
            get_instance_info
            check_application_logs
            ;;
        "report")
            log_info "📊 Generating comprehensive health report..."
            get_instance_info
            get_alb_info
            check_instance_health
            check_alb_health
            check_cloudwatch_metrics
            generate_health_report
            ;;
        "restart")
            log_info "🔄 Restarting application services..."
            get_instance_info
            restart_services
            ;;
        "watch")
            log_info "👀 Monitoring in real-time (Ctrl+C to stop)..."
            while true; do
                clear
                echo "Monitoring Recruitment Backend - $(date)"
                echo "=================================="
                get_instance_info
                check_instance_health
                check_alb_health
                echo ""
                log_info "Next check in 30 seconds..."
                sleep 30
            done
            ;;
        *)
            echo "Usage: $0 [check|logs|report|restart|watch]"
            echo ""
            echo "Commands:"
            echo "  check    - Basic health check (default)"
            echo "  logs     - Show recent application logs"
            echo "  report   - Generate comprehensive health report"
            echo "  restart  - Restart application services"
            echo "  watch    - Continuous monitoring"
            echo ""
            exit 1
            ;;
    esac
}

# Run main function
main "$@"