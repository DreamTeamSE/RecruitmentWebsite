#!/bin/bash

# AWS Resources Teardown Script
# This script tears down AWS resources for the recruitment website

set -e

echo "🔥 Starting AWS resources teardown..."

# Set variables (customize these for your environment)
APP_NAME="recruitment-website"
ECS_CLUSTER_NAME="recruitment-cluster"
ECS_SERVICE_NAME="recruitment-backend"
ECR_REPOSITORY="recruitment-backend"
RDS_INSTANCE_ID="recruitment-db"
REGION="us-east-1"

# Discover resources dynamically
echo "🔍 Discovering AWS resources..."
AMPLIFY_APP_ID=$(aws amplify list-apps --region $REGION --query 'apps[?name==`'$APP_NAME'-frontend`].appId' --output text 2>/dev/null || echo "")
CLOUDFRONT_DISTRIBUTIONS=$(aws cloudfront list-distributions --query 'DistributionList.Items[?Comment==`'$APP_NAME'`].Id' --output text 2>/dev/null || echo "")

echo "⚠️  WARNING: This will delete all AWS resources for the recruitment website!"
echo "Resources to be deleted:"
if [ ! -z "$AMPLIFY_APP_ID" ]; then
    echo "  - Amplify App: $AMPLIFY_APP_ID"
else
    echo "  - Amplify App: Not found"
fi
echo "  - ECS Service: $ECS_SERVICE_NAME"
echo "  - ECS Cluster: $ECS_CLUSTER_NAME"
echo "  - ECR Repository: $ECR_REPOSITORY"
if [ ! -z "$CLOUDFRONT_DISTRIBUTIONS" ]; then
    echo "  - CloudFront Distributions: $CLOUDFRONT_DISTRIBUTIONS"
else
    echo "  - CloudFront Distributions: Not found"
fi
echo "  - RDS Instance: $RDS_INSTANCE_ID"
echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Teardown cancelled."
    exit 1
fi

# Function to check if AWS CLI is installed and configured
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        echo "❌ AWS CLI not found. Please install and configure AWS CLI first."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        echo "❌ AWS CLI not configured. Please run 'aws configure' first."
        exit 1
    fi
}

# Function to delete ECS resources
teardown_ecs() {
    echo "🗑️  Tearing down ECS resources..."
    
    # Stop and delete ECS service
    if aws ecs describe-services --cluster $ECS_CLUSTER_NAME --services $ECS_SERVICE_NAME --region $REGION &> /dev/null; then
        echo "  - Stopping ECS service: $ECS_SERVICE_NAME"
        aws ecs update-service --cluster $ECS_CLUSTER_NAME --service $ECS_SERVICE_NAME --desired-count 0 --region $REGION
        
        echo "  - Waiting for service to stop..."
        aws ecs wait services-stable --cluster $ECS_CLUSTER_NAME --services $ECS_SERVICE_NAME --region $REGION
        
        echo "  - Deleting ECS service: $ECS_SERVICE_NAME"
        aws ecs delete-service --cluster $ECS_CLUSTER_NAME --service $ECS_SERVICE_NAME --region $REGION
    else
        echo "  - ECS service $ECS_SERVICE_NAME not found, skipping..."
    fi
    
    # Delete ECS cluster
    if aws ecs describe-clusters --clusters $ECS_CLUSTER_NAME --region $REGION --query 'clusters[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
        echo "  - Deleting ECS cluster: $ECS_CLUSTER_NAME"
        aws ecs delete-cluster --cluster $ECS_CLUSTER_NAME --region $REGION
    else
        echo "  - ECS cluster $ECS_CLUSTER_NAME not found, skipping..."
    fi
}

# Function to delete ECR repository
teardown_ecr() {
    echo "🗑️  Tearing down ECR repository..."
    
    if aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $REGION &> /dev/null; then
        echo "  - Deleting ECR repository: $ECR_REPOSITORY"
        aws ecr delete-repository --repository-name $ECR_REPOSITORY --force --region $REGION
    else
        echo "  - ECR repository $ECR_REPOSITORY not found, skipping..."
    fi
}

# Function to delete CloudFront distribution
teardown_cloudfront() {
    echo "🗑️  Tearing down CloudFront distributions..."
    
    if [ ! -z "$CLOUDFRONT_DISTRIBUTIONS" ]; then
        for CLOUDFRONT_DISTRIBUTION_ID in $CLOUDFRONT_DISTRIBUTIONS; do
            if aws cloudfront get-distribution --id $CLOUDFRONT_DISTRIBUTION_ID &> /dev/null; then
                echo "  - Disabling CloudFront distribution: $CLOUDFRONT_DISTRIBUTION_ID"
                ETAG=$(aws cloudfront get-distribution --id $CLOUDFRONT_DISTRIBUTION_ID --query 'ETag' --output text)
                aws cloudfront get-distribution --id $CLOUDFRONT_DISTRIBUTION_ID --query 'Distribution.DistributionConfig' > /tmp/dist-config.json
                
                # Check if jq is available
                if command -v jq &> /dev/null; then
                    # Update distribution config to disable it
                    jq '.Enabled = false' /tmp/dist-config.json > /tmp/dist-config-disabled.json
                    aws cloudfront update-distribution --id $CLOUDFRONT_DISTRIBUTION_ID --distribution-config file:///tmp/dist-config-disabled.json --if-match $ETAG
                    
                    echo "  - Waiting for CloudFront distribution to be disabled..."
                    aws cloudfront wait distribution-deployed --id $CLOUDFRONT_DISTRIBUTION_ID
                    
                    echo "  - Deleting CloudFront distribution: $CLOUDFRONT_DISTRIBUTION_ID"
                    NEW_ETAG=$(aws cloudfront get-distribution --id $CLOUDFRONT_DISTRIBUTION_ID --query 'ETag' --output text)
                    aws cloudfront delete-distribution --id $CLOUDFRONT_DISTRIBUTION_ID --if-match $NEW_ETAG
                else
                    echo "  - jq not found, cannot disable CloudFront distribution automatically"
                    echo "  - Please disable and delete CloudFront distribution $CLOUDFRONT_DISTRIBUTION_ID manually"
                fi
            else
                echo "  - CloudFront distribution $CLOUDFRONT_DISTRIBUTION_ID not found, skipping..."
            fi
        done
    else
        echo "  - No CloudFront distributions found to delete"
    fi
    
    # Clean up temporary files
    rm -f /tmp/dist-config.json /tmp/dist-config-disabled.json
}

# Function to delete RDS instance
teardown_rds() {
    echo "🗑️  Tearing down RDS instance..."
    
    if aws rds describe-db-instances --db-instance-identifier $RDS_INSTANCE_ID --region $REGION &> /dev/null; then
        echo "  - Deleting RDS instance: $RDS_INSTANCE_ID"
        aws rds delete-db-instance --db-instance-identifier $RDS_INSTANCE_ID --skip-final-snapshot --region $REGION
        
        echo "  - Waiting for RDS instance to be deleted..."
        aws rds wait db-instance-deleted --db-instance-identifier $RDS_INSTANCE_ID --region $REGION
    else
        echo "  - RDS instance $RDS_INSTANCE_ID not found, skipping..."
    fi
}

# Function to delete Amplify app
teardown_amplify() {
    echo "🗑️  Tearing down Amplify app..."
    
    if aws amplify get-app --app-id $AMPLIFY_APP_ID --region $REGION &> /dev/null; then
        echo "  - Deleting Amplify app: $AMPLIFY_APP_ID"
        aws amplify delete-app --app-id $AMPLIFY_APP_ID --region $REGION
    else
        echo "  - Amplify app $AMPLIFY_APP_ID not found, skipping..."
    fi
}

# Main teardown sequence
main() {
    check_aws_cli
    
    echo "🚀 Starting teardown process..."
    
    # Teardown in reverse dependency order
    teardown_amplify
    teardown_cloudfront
    teardown_ecs
    teardown_ecr
    teardown_rds
    
    echo "✅ AWS resources teardown completed!"
    echo ""
    echo "📝 Note: Some resources may take additional time to fully delete."
    echo "   Check the AWS console to confirm all resources are removed."
}

# Run main function
main