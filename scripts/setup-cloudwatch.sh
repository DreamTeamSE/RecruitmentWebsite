#!/bin/bash

# CloudWatch Agent Setup Script for Recruitment Backend
# This script installs and configures CloudWatch agent on EC2 instance

set -euo pipefail

echo "🔧 Setting up CloudWatch agent for Recruitment Backend..."

# Variables
REGION=${AWS_REGION:-us-east-2}
CONFIG_FILE="/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json"
SERVICE_NAME="amazon-cloudwatch-agent"

# Create log directories
echo "📁 Creating log directories..."
sudo mkdir -p /var/log/recruitment
sudo mkdir -p /home/ec2-user/recruitment-app/logs
sudo chown ec2-user:ec2-user /home/ec2-user/recruitment-app/logs

# Download and install CloudWatch agent
echo "📥 Downloading CloudWatch agent..."
cd /tmp
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm

echo "📦 Installing CloudWatch agent..."
sudo rpm -U ./amazon-cloudwatch-agent.rpm

# Copy configuration file
echo "⚙️ Setting up CloudWatch agent configuration..."
sudo cp /home/ec2-user/recruitment-app/scripts/cloudwatch-config.json "$CONFIG_FILE"

# Create IAM role trust policy if needed
create_cloudwatch_role() {
    echo "🔐 Creating CloudWatch IAM role..."
    
    # Trust policy for EC2
    cat > /tmp/cloudwatch-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    # Check if role exists
    if ! aws iam get-role --role-name CloudWatchAgentServerRole >/dev/null 2>&1; then
        echo "Creating CloudWatchAgentServerRole..."
        aws iam create-role \
            --role-name CloudWatchAgentServerRole \
            --assume-role-policy-document file:///tmp/cloudwatch-trust-policy.json \
            --region "$REGION"
    fi

    # Attach policies
    aws iam attach-role-policy \
        --role-name CloudWatchAgentServerRole \
        --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy \
        --region "$REGION"

    # Create instance profile if it doesn't exist
    if ! aws iam get-instance-profile --instance-profile-name CloudWatchAgentServerRole >/dev/null 2>&1; then
        aws iam create-instance-profile --instance-profile-name CloudWatchAgentServerRole
        aws iam add-role-to-instance-profile \
            --instance-profile-name CloudWatchAgentServerRole \
            --role-name CloudWatchAgentServerRole
    fi
}

# Start CloudWatch agent
start_cloudwatch_agent() {
    echo "🚀 Starting CloudWatch agent..."
    
    # Start and enable the service
    sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
        -a fetch-config \
        -m ec2 \
        -s \
        -c file:"$CONFIG_FILE"

    # Enable auto-start
    sudo systemctl enable amazon-cloudwatch-agent
    
    echo "✅ CloudWatch agent started successfully"
}

# Create log groups
create_log_groups() {
    echo "📊 Creating CloudWatch log groups..."
    
    local log_groups=(
        "/aws/ec2/recruitment-backend/application"
        "/aws/ec2/recruitment-backend/nginx-access"
        "/aws/ec2/recruitment-backend/nginx-error"
        "/aws/ec2/recruitment-backend/nginx-ssl-access"
        "/aws/ec2/recruitment-backend/nginx-ssl-error"
        "/aws/ec2/recruitment-backend/system"
        "/aws/ec2/recruitment-backend/docker"
        "/aws/ec2/recruitment-backend/app-logs"
    )
    
    for log_group in "${log_groups[@]}"; do
        if ! aws logs describe-log-groups --log-group-name-prefix "$log_group" --region "$REGION" | grep -q "$log_group"; then
            echo "Creating log group: $log_group"
            aws logs create-log-group --log-group-name "$log_group" --region "$REGION"
            
            # Set retention policy (30 days)
            aws logs put-retention-policy \
                --log-group-name "$log_group" \
                --retention-in-days 30 \
                --region "$REGION"
        else
            echo "Log group already exists: $log_group"
        fi
    done
}

# Health check function
check_cloudwatch_status() {
    echo "🔍 Checking CloudWatch agent status..."
    
    if sudo systemctl is-active --quiet amazon-cloudwatch-agent; then
        echo "✅ CloudWatch agent is running"
        
        # Show recent logs
        echo "📋 Recent CloudWatch agent logs:"
        sudo tail -10 /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log || true
        
        return 0
    else
        echo "❌ CloudWatch agent is not running"
        
        # Show error logs
        echo "📋 CloudWatch agent error logs:"
        sudo tail -20 /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log || true
        
        return 1
    fi
}

# Main execution
main() {
    echo "🚀 Starting CloudWatch setup for Recruitment Backend"
    
    # Check if AWS CLI is configured
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        echo "❌ AWS CLI not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Create IAM role (optional - may already exist)
    if [[ "${CREATE_IAM_ROLE:-false}" == "true" ]]; then
        create_cloudwatch_role
    fi
    
    # Create log groups
    create_log_groups
    
    # Start CloudWatch agent
    start_cloudwatch_agent
    
    # Health check
    if check_cloudwatch_status; then
        echo "✅ CloudWatch setup completed successfully!"
        echo "📊 Monitor your logs at: https://$REGION.console.aws.amazon.com/cloudwatch/home?region=$REGION#logsV2:log-groups"
    else
        echo "❌ CloudWatch setup completed with warnings. Check the logs above."
        exit 1
    fi
}

# Run main function
main "$@"