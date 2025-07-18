#!/bin/bash

set -e

echo "🚀 Starting CDK Frontend Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    print_error "AWS CDK is not installed. Please install it with: npm install -g aws-cdk"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Please run 'aws configure'"
    exit 1
fi

print_status "Building frontend..."
cd frontend
npm run build
cd ..

print_status "Installing CDK dependencies..."
cd infrastructure
npm install

print_status "Bootstrapping CDK (if needed)..."
cdk bootstrap --quiet || true

print_status "Synthesizing CDK stack..."
cdk synth

print_status "Deploying frontend infrastructure..."
cdk deploy --require-approval never

print_status "✅ Frontend deployment completed successfully!"

# Get the outputs
WEBSITE_URL=$(aws cloudformation describe-stacks \
    --stack-name RecruitmentWebsiteFrontendStack \
    --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
    --output text)

if [ ! -z "$WEBSITE_URL" ]; then
    print_status "🌐 Your website is available at: $WEBSITE_URL"
else
    print_warning "Could not retrieve website URL from stack outputs"
fi

cd ..