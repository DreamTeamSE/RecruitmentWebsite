#!/bin/bash

set -e

# Get paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Config
APP_NAME="recruitment-website"
REGION="us-east-1"
ECR_REPOSITORY="recruitment-backend"
ECS_CLUSTER_NAME="recruitment-cluster"
ECS_SERVICE_NAME="recruitment-backend"
ECS_TASK_DEFINITION="recruitment-backend-task"
RDS_INSTANCE_ID="recruitment-db"
RDS_DB_NAME="recruitment"
RDS_USERNAME="postgres"

# Check prerequisites
if ! command -v aws &> /dev/null || ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured"
    exit 1
fi

if ! command -v docker &> /dev/null || ! docker info &> /dev/null; then
    echo "❌ Docker not running"
    exit 1
fi

if [ ! -d "$PROJECT_ROOT/backend" ] || [ ! -f "$PROJECT_ROOT/backend/Dockerfile" ]; then
    echo "❌ Backend directory or Dockerfile not found"
    exit 1
fi

echo "🚀 Deploying to AWS..."

# Create ECR repository if needed
if ! aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $REGION &> /dev/null; then
    aws ecr create-repository --repository-name $ECR_REPOSITORY --region $REGION > /dev/null
fi

ECR_URI=$(aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $REGION --query 'repositories[0].repositoryUri' --output text)

# Build and push Docker image
echo "🐳 Building image..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URI > /dev/null

pushd "$PROJECT_ROOT/backend" > /dev/null
if ! docker build -t $ECR_REPOSITORY .; then
    echo "❌ Docker build failed. Fix TypeScript errors first."
    exit 1
fi
popd > /dev/null

docker tag $ECR_REPOSITORY:latest $ECR_URI:latest
docker push $ECR_URI:latest > /dev/null

# Create RDS if needed
if ! aws rds describe-db-instances --db-instance-identifier $RDS_INSTANCE_ID --region $REGION &> /dev/null; then
    echo "🗄️ Creating database..."
    RDS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    # Get default security group ID
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text --region $REGION)
    DEFAULT_SG=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=default" --query 'SecurityGroups[0].GroupId' --output text --region $REGION)
    
    aws rds create-db-instance \
        --db-instance-identifier $RDS_INSTANCE_ID \
        --db-instance-class db.t3.micro \
        --engine postgres \
        --master-username $RDS_USERNAME \
        --master-user-password $RDS_PASSWORD \
        --allocated-storage 20 \
        --db-name $RDS_DB_NAME \
        --vpc-security-group-ids $DEFAULT_SG \
        --publicly-accessible \
        --region $REGION > /dev/null
    
    echo "📝 Database password: $RDS_PASSWORD"
    aws rds wait db-instance-available --db-instance-identifier $RDS_INSTANCE_ID --region $REGION
fi

RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $RDS_INSTANCE_ID --region $REGION --query 'DBInstances[0].Endpoint.Address' --output text)

# Create ECS cluster if needed
if ! aws ecs describe-clusters --clusters $ECS_CLUSTER_NAME --region $REGION --query 'clusters[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
    aws ecs create-cluster --cluster-name $ECS_CLUSTER_NAME --region $REGION > /dev/null
fi

# Create log group
aws logs create-log-group --log-group-name "/ecs/$ECS_TASK_DEFINITION" --region $REGION 2>/dev/null || true

# Create task definition
DATABASE_URL="postgresql://$RDS_USERNAME:${RDS_PASSWORD:-YOUR_PASSWORD}@$RDS_ENDPOINT:5432/$RDS_DB_NAME"

cat > "$SCRIPT_DIR/task-definition.json" << EOF
{
    "family": "$ECS_TASK_DEFINITION",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "256",
    "memory": "512",
    "executionRoleArn": "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/ecsTaskExecutionRole",
    "containerDefinitions": [{
        "name": "recruitment-backend",
        "image": "$ECR_URI:latest",
        "portMappings": [{"containerPort": 3000, "protocol": "tcp"}],
        "essential": true,
        "environment": [
            {"name": "NODE_ENV", "value": "production"},
            {"name": "PORT", "value": "3000"},
            {"name": "DATABASE_URL", "value": "$DATABASE_URL"}
        ],
        "logConfiguration": {
            "logDriver": "awslogs",
            "options": {
                "awslogs-group": "/ecs/$ECS_TASK_DEFINITION",
                "awslogs-region": "$REGION",
                "awslogs-stream-prefix": "ecs"
            }
        }
    }]
}
EOF

aws ecs register-task-definition --cli-input-json "file://$SCRIPT_DIR/task-definition.json" --region $REGION > /dev/null
rm "$SCRIPT_DIR/task-definition.json"

# Create ECS service if needed
if ! aws ecs describe-services --cluster $ECS_CLUSTER_NAME --services $ECS_SERVICE_NAME --region $REGION &> /dev/null; then
    echo "🚀 Creating service..."
    
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text --region $REGION)
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[].SubnetId' --output text --region $REGION)
    SECURITY_GROUP_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=default" --query 'SecurityGroups[0].GroupId' --output text --region $REGION)
    
    aws ecs create-service \
        --cluster $ECS_CLUSTER_NAME \
        --service-name $ECS_SERVICE_NAME \
        --task-definition $ECS_TASK_DEFINITION \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SECURITY_GROUP_ID],assignPublicIp=ENABLED}" \
        --region $REGION > /dev/null
    
    aws ecs wait services-stable --cluster $ECS_CLUSTER_NAME --services $ECS_SERVICE_NAME --region $REGION
fi

echo "✅ Deployment complete"
echo "📋 Summary:"
echo "  ECR: $ECR_URI"
echo "  RDS: $RDS_ENDPOINT"
echo "  ECS: $ECS_CLUSTER_NAME/$ECS_SERVICE_NAME"