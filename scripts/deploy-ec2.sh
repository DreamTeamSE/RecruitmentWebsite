#!/bin/bash

# AWS EC2 Backend Deployment Script
# This script deploys the recruitment website backend to a dedicated EC2 instance
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-2"}
KEY_NAME=${KEY_NAME:-"recruitment-backend-key"}
INSTANCE_TYPE=${INSTANCE_TYPE:-"t3.small"}
AMI_ID=${AMI_ID:-"ami-0c02fb55956c7d316"} # Amazon Linux 2 AMI
SECURITY_GROUP_NAME="recruitment-backend-sg"
INSTANCE_NAME="recruitment-backend-instance"
ALB_NAME="recruitment-backend-alb"
TARGET_GROUP_NAME="recruitment-backend-targets"

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

log_debug() {
    echo -e "${PURPLE}[DEBUG]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Run 'aws configure' first."
        exit 1
    fi
    
    # Check if backend directory exists
    if [[ ! -d "$BACKEND_DIR" ]]; then
        log_error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Create or get VPC
setup_vpc() {
    log_step "Setting up VPC and networking..."
    
    # Get default VPC
    VPC_ID=$(aws ec2 describe-vpcs \
        --filters "Name=is-default,Values=true" \
        --query 'Vpcs[0].VpcId' \
        --output text \
        --region $AWS_REGION)
    
    if [[ "$VPC_ID" == "None" ]]; then
        log_error "No default VPC found. Please create a VPC first."
        exit 1
    fi
    
    log_info "Using VPC: $VPC_ID"
    
    # Get subnets
    SUBNET_IDS=$(aws ec2 describe-subnets \
        --filters "Name=vpc-id,Values=$VPC_ID" \
        --query 'Subnets[*].SubnetId' \
        --output text \
        --region $AWS_REGION)
    
    if [[ -z "$SUBNET_IDS" ]]; then
        log_error "No subnets found in VPC $VPC_ID"
        exit 1
    fi
    
    # Get first subnet for instance
    SUBNET_ID=$(echo $SUBNET_IDS | cut -d' ' -f1)
    log_info "Using subnet: $SUBNET_ID"
}

# Create security group
create_security_group() {
    log_step "Creating security group..."
    
    # Check if security group exists
    EXISTING_SG=$(aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=$SECURITY_GROUP_NAME" \
        --query 'SecurityGroups[0].GroupId' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "None")
    
    if [[ "$EXISTING_SG" != "None" ]]; then
        log_info "Security group already exists: $EXISTING_SG"
        SECURITY_GROUP_ID=$EXISTING_SG
        return
    fi
    
    # Create security group
    SECURITY_GROUP_ID=$(aws ec2 create-security-group \
        --group-name $SECURITY_GROUP_NAME \
        --description "Security group for recruitment backend" \
        --vpc-id $VPC_ID \
        --query 'GroupId' \
        --output text \
        --region $AWS_REGION)
    
    log_info "Created security group: $SECURITY_GROUP_ID"
    
    # Add inbound rules
    aws ec2 authorize-security-group-ingress \
        --group-id $SECURITY_GROUP_ID \
        --protocol tcp \
        --port 22 \
        --cidr 0.0.0.0/0 \
        --region $AWS_REGION
    
    aws ec2 authorize-security-group-ingress \
        --group-id $SECURITY_GROUP_ID \
        --protocol tcp \
        --port 3000 \
        --cidr 0.0.0.0/0 \
        --region $AWS_REGION
    
    aws ec2 authorize-security-group-ingress \
        --group-id $SECURITY_GROUP_ID \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0 \
        --region $AWS_REGION
    
    aws ec2 authorize-security-group-ingress \
        --group-id $SECURITY_GROUP_ID \
        --protocol tcp \
        --port 443 \
        --cidr 0.0.0.0/0 \
        --region $AWS_REGION
    
    log_info "Security group rules configured"
}

# Create key pair
create_key_pair() {
    log_step "Creating key pair..."
    
    # Check if key pair exists
    EXISTING_KEY=$(aws ec2 describe-key-pairs \
        --key-names $KEY_NAME \
        --query 'KeyPairs[0].KeyName' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "None")
    
    if [[ "$EXISTING_KEY" != "None" ]]; then
        log_info "Key pair already exists: $KEY_NAME"
        
        # Check if private key file exists locally
        if [[ ! -f "$HOME/.ssh/$KEY_NAME.pem" ]]; then
            log_warn "Private key file not found at $HOME/.ssh/$KEY_NAME.pem"
            log_warn "You may need to manually place the private key file there for SSH access"
        fi
        return
    fi
    
    # Create key pair
    aws ec2 create-key-pair \
        --key-name $KEY_NAME \
        --query 'KeyMaterial' \
        --output text \
        --region $AWS_REGION > "$HOME/.ssh/$KEY_NAME.pem"
    
    chmod 600 "$HOME/.ssh/$KEY_NAME.pem"
    log_info "Created key pair: $KEY_NAME"
    log_info "Private key saved to: $HOME/.ssh/$KEY_NAME.pem"
}

# Create user data script
create_user_data() {
    log_step "Creating user data script..."
    
    cat > /tmp/user-data.sh << 'EOF'
#!/bin/bash
yum update -y
yum install -y docker git

# Start Docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Create app directory
mkdir -p /opt/recruitment-backend
chown ec2-user:ec2-user /opt/recruitment-backend

# Create systemd service for the application
cat > /etc/systemd/system/recruitment-backend.service << 'SYSTEMD_EOF'
[Unit]
Description=Recruitment Backend API
After=network.target docker.service
Requires=docker.service

[Service]
Type=notify
User=ec2-user
WorkingDirectory=/opt/recruitment-backend
ExecStart=/usr/local/bin/docker-compose -f docker-compose.production.yml up
ExecStop=/usr/local/bin/docker-compose -f docker-compose.production.yml down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SYSTEMD_EOF

systemctl daemon-reload
systemctl enable recruitment-backend

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
rpm -U ./amazon-cloudwatch-agent.rpm

# Create CloudWatch agent config
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'CW_EOF'
{
    "metrics": {
        "namespace": "RecruitmentBackend",
        "metrics_collected": {
            "cpu": {
                "measurement": ["cpu_usage_idle", "cpu_usage_iowait", "cpu_usage_user", "cpu_usage_system"],
                "metrics_collection_interval": 60
            },
            "disk": {
                "measurement": ["used_percent"],
                "metrics_collection_interval": 60,
                "resources": ["*"]
            },
            "mem": {
                "measurement": ["mem_used_percent"],
                "metrics_collection_interval": 60
            }
        }
    },
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/opt/recruitment-backend/logs/*.log",
                        "log_group_name": "/aws/ec2/recruitment-backend",
                        "log_stream_name": "{instance_id}-application",
                        "timezone": "UTC"
                    },
                    {
                        "file_path": "/var/log/messages",
                        "log_group_name": "/aws/ec2/recruitment-backend",
                        "log_stream_name": "{instance_id}-system",
                        "timezone": "UTC"
                    }
                ]
            }
        }
    }
}
CW_EOF

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
    -s

# Signal that setup is complete
/opt/aws/bin/cfn-signal -e $? --stack ${AWS::StackName} --resource EC2Instance --region ${AWS::Region}
EOF

    log_info "User data script created"
}

# Launch EC2 instance
launch_instance() {
    log_step "Launching EC2 instance..."
    
    # Check if instance already exists
    EXISTING_INSTANCE=$(aws ec2 describe-instances \
        --filters "Name=tag:Name,Values=$INSTANCE_NAME" "Name=instance-state-name,Values=running,pending" \
        --query 'Reservations[0].Instances[0].InstanceId' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "None")
    
    if [[ "$EXISTING_INSTANCE" != "None" ]]; then
        log_info "Instance already exists: $EXISTING_INSTANCE"
        INSTANCE_ID=$EXISTING_INSTANCE
        
        # Get instance details
        INSTANCE_IP=$(aws ec2 describe-instances \
            --instance-ids $INSTANCE_ID \
            --query 'Reservations[0].Instances[0].PublicIpAddress' \
            --output text \
            --region $AWS_REGION)
        
        log_info "Instance IP: $INSTANCE_IP"
        return
    fi
    
    create_user_data
    
    # Launch instance
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id $AMI_ID \
        --count 1 \
        --instance-type $INSTANCE_TYPE \
        --key-name $KEY_NAME \
        --security-group-ids $SECURITY_GROUP_ID \
        --subnet-id $SUBNET_ID \
        --user-data file:///tmp/user-data.sh \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME},{Key=Project,Value=RecruitmentWebsite},{Key=Environment,Value=Production}]" \
        --query 'Instances[0].InstanceId' \
        --output text \
        --region $AWS_REGION)
    
    log_info "Launched instance: $INSTANCE_ID"
    
    # Wait for instance to be running
    log_info "Waiting for instance to be running..."
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $AWS_REGION
    
    # Get instance IP
    INSTANCE_IP=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text \
        --region $AWS_REGION)
    
    log_info "Instance is running. IP: $INSTANCE_IP"
    
    # Clean up temporary files
    rm -f /tmp/user-data.sh
}

# Deploy application to instance
deploy_application() {
    log_step "Deploying application to EC2 instance..."
    
    log_info "Waiting for instance to be fully initialized (3 minutes)..."
    sleep 180
    
    # Create deployment package
    log_info "Creating deployment package..."
    cd "$BACKEND_DIR"
    tar -czf /tmp/backend-deployment.tar.gz \
        --exclude=node_modules \
        --exclude=dist \
        --exclude=coverage \
        --exclude=.git \
        .
    
    # Copy deployment package to instance
    log_info "Copying application files to instance..."
    scp -i "$HOME/.ssh/$KEY_NAME.pem" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        /tmp/backend-deployment.tar.gz \
        ec2-user@$INSTANCE_IP:/tmp/
    
    # Copy environment file if it exists
    if [[ -f "$BACKEND_DIR/.env.production" ]]; then
        scp -i "$HOME/.ssh/$KEY_NAME.pem" \
            -o StrictHostKeyChecking=no \
            -o UserKnownHostsFile=/dev/null \
            "$BACKEND_DIR/.env.production" \
            ec2-user@$INSTANCE_IP:/tmp/
    else
        log_warn "No .env.production file found. Creating template..."
        ssh -i "$HOME/.ssh/$KEY_NAME.pem" \
            -o StrictHostKeyChecking=no \
            -o UserKnownHostsFile=/dev/null \
            ec2-user@$INSTANCE_IP << 'SSH_EOF'
cat > /tmp/.env.production << 'ENV_EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://admin:CHANGE_ME@recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com:5432/postgres
JWT_SECRET=CHANGE_ME_TO_SECURE_SECRET
CORS_ORIGIN=https://main.d1d64zijwu2pjz.amplifyapp.com
FRONTEND_URL=https://main.d1d64zijwu2pjz.amplifyapp.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=internal.software@dreamteameng.org
SMTP_PASSWORD=CHANGE_ME
REDIS_PASSWORD=CHANGE_ME
POSTGRES_DB=postgres
POSTGRES_PASSWORD=CHANGE_ME
ENV_EOF
SSH_EOF
        log_warn "Please update /opt/recruitment-backend/.env.production with actual values"
    fi
    
    # Deploy on instance
    ssh -i "$HOME/.ssh/$KEY_NAME.pem" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        ec2-user@$INSTANCE_IP << 'SSH_EOF'
# Extract application
cd /opt/recruitment-backend
tar -xzf /tmp/backend-deployment.tar.gz
mv /tmp/.env.production .

# Install dependencies and build
npm install --production
npm run build

# Start services
docker-compose -f docker-compose.production.yml up -d

# Wait for services to be healthy
sleep 60

# Check health
curl -f http://localhost:3000/health || echo "Health check failed"

# Start the systemd service
sudo systemctl start recruitment-backend
sudo systemctl status recruitment-backend

echo "Application deployment completed"
SSH_EOF
    
    # Clean up local files
    rm -f /tmp/backend-deployment.tar.gz
    
    log_info "Application deployed successfully"
}

# Create Application Load Balancer
create_load_balancer() {
    log_step "Creating Application Load Balancer..."
    
    # Check if ALB exists
    EXISTING_ALB=$(aws elbv2 describe-load-balancers \
        --names $ALB_NAME \
        --query 'LoadBalancers[0].LoadBalancerArn' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "None")
    
    if [[ "$EXISTING_ALB" != "None" ]]; then
        log_info "Load balancer already exists: $ALB_NAME"
        ALB_ARN=$EXISTING_ALB
        
        # Get ALB DNS name
        ALB_DNS=$(aws elbv2 describe-load-balancers \
            --load-balancer-arns $ALB_ARN \
            --query 'LoadBalancers[0].DNSName' \
            --output text \
            --region $AWS_REGION)
        
        log_info "Load balancer DNS: $ALB_DNS"
        return
    fi
    
    # Get all subnets for ALB (needs at least 2 AZs)
    ALL_SUBNETS=$(aws ec2 describe-subnets \
        --filters "Name=vpc-id,Values=$VPC_ID" \
        --query 'Subnets[*].SubnetId' \
        --output text \
        --region $AWS_REGION)
    
    # Create ALB
    ALB_ARN=$(aws elbv2 create-load-balancer \
        --name $ALB_NAME \
        --subnets $ALL_SUBNETS \
        --security-groups $SECURITY_GROUP_ID \
        --scheme internet-facing \
        --type application \
        --ip-address-type ipv4 \
        --query 'LoadBalancers[0].LoadBalancerArn' \
        --output text \
        --region $AWS_REGION)
    
    log_info "Created load balancer: $ALB_ARN"
    
    # Create target group
    TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
        --name $TARGET_GROUP_NAME \
        --protocol HTTP \
        --port 3000 \
        --vpc-id $VPC_ID \
        --health-check-protocol HTTP \
        --health-check-path /health \
        --health-check-interval-seconds 30 \
        --health-check-timeout-seconds 5 \
        --healthy-threshold-count 2 \
        --unhealthy-threshold-count 3 \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text \
        --region $AWS_REGION)
    
    log_info "Created target group: $TARGET_GROUP_ARN"
    
    # Register instance with target group
    aws elbv2 register-targets \
        --target-group-arn $TARGET_GROUP_ARN \
        --targets Id=$INSTANCE_ID,Port=3000 \
        --region $AWS_REGION
    
    log_info "Registered instance with target group"
    
    # Create listener
    LISTENER_ARN=$(aws elbv2 create-listener \
        --load-balancer-arn $ALB_ARN \
        --protocol HTTP \
        --port 80 \
        --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
        --query 'Listeners[0].ListenerArn' \
        --output text \
        --region $AWS_REGION)
    
    log_info "Created listener: $LISTENER_ARN"
    
    # Get ALB DNS name
    ALB_DNS=$(aws elbv2 describe-load-balancers \
        --load-balancer-arns $ALB_ARN \
        --query 'LoadBalancers[0].DNSName' \
        --output text \
        --region $AWS_REGION)
    
    log_info "Load balancer DNS: $ALB_DNS"
    
    # Wait for ALB to be active
    log_info "Waiting for load balancer to be active..."
    aws elbv2 wait load-balancer-available --load-balancer-arns $ALB_ARN --region $AWS_REGION
    
    log_info "Load balancer is active"
}

# Test deployment
test_deployment() {
    log_step "Testing deployment..."
    
    # Test direct instance access
    log_info "Testing direct instance access..."
    if curl -sf "http://$INSTANCE_IP:3000/health" >/dev/null; then
        log_info "✅ Direct instance health check passed"
    else
        log_error "❌ Direct instance health check failed"
    fi
    
    # Test ALB access
    if [[ -n "$ALB_DNS" ]]; then
        log_info "Testing load balancer access..."
        sleep 30 # Wait for health checks to pass
        if curl -sf "http://$ALB_DNS/health" >/dev/null; then
            log_info "✅ Load balancer health check passed"
        else
            log_warn "❌ Load balancer health check failed (may need time for health checks)"
        fi
    fi
}

# Main deployment function
main() {
    log_info "🚀 Starting AWS EC2 Backend Deployment"
    log_info "Region: $AWS_REGION"
    log_info "Instance Type: $INSTANCE_TYPE"
    echo ""
    
    check_prerequisites
    setup_vpc
    create_security_group
    create_key_pair
    launch_instance
    deploy_application
    create_load_balancer
    test_deployment
    
    echo ""
    log_info "🎉 Deployment completed successfully!"
    echo ""
    log_info "=== DEPLOYMENT SUMMARY ==="
    log_info "Instance ID: $INSTANCE_ID"
    log_info "Instance IP: $INSTANCE_IP"
    log_info "Security Group: $SECURITY_GROUP_ID"
    if [[ -n "$ALB_DNS" ]]; then
        log_info "Load Balancer: $ALB_DNS"
        log_info "Backend URL: http://$ALB_DNS"
    fi
    log_info "SSH Access: ssh -i ~/.ssh/$KEY_NAME.pem ec2-user@$INSTANCE_IP"
    echo ""
    log_info "=== ENDPOINTS ==="
    log_info "Direct Health Check: http://$INSTANCE_IP:3000/health"
    if [[ -n "$ALB_DNS" ]]; then
        log_info "ALB Health Check: http://$ALB_DNS/health"
        log_info "API Base URL: http://$ALB_DNS"
    fi
    echo ""
    log_info "=== NEXT STEPS ==="
    log_warn "1. Update frontend NEXT_PUBLIC_BACKEND_URL to point to the ALB"
    log_warn "2. Configure SSL certificate for HTTPS"
    log_warn "3. Update CORS_ORIGIN in backend environment"
    log_warn "4. Set up proper database credentials"
    log_warn "5. Configure monitoring and alerts"
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --region REGION        AWS region (default: us-east-2)"
    echo "  --instance-type TYPE   EC2 instance type (default: t3.small)"
    echo "  --key-name NAME        Key pair name (default: recruitment-backend-key)"
    echo "  --help                 Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  AWS_REGION            AWS region"
    echo "  INSTANCE_TYPE         EC2 instance type"
    echo "  KEY_NAME              Key pair name"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        --instance-type)
            INSTANCE_TYPE="$2"
            shift 2
            ;;
        --key-name)
            KEY_NAME="$2"
            shift 2
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main function
main "$@"