# 🚀 Comprehensive Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Recruitment Website application, which consists of:
- **Frontend**: Next.js application hosted on AWS Amplify
- **Backend**: Node.js/Express API containerized and deployed on AWS ECS Fargate
- **Database**: PostgreSQL on AWS RDS with SSL encryption

## Architecture Overview

```
┌─────────────────┐    HTTPS    ┌─────────────────┐    HTTPS    ┌─────────────────┐
│   AWS Amplify   │────────────▶│   CloudFront    │────────────▶│   ECS Fargate   │
│   (Frontend)    │             │   Distribution  │             │   (Backend)     │
└─────────────────┘             └─────────────────┘             └─────────────────┘
                                                                          │
                                                                          │ SSL
                                                                          ▼
                                                                 ┌─────────────────┐
                                                                 │   RDS PostgreSQL│
                                                                 │   (Database)    │
                                                                 └─────────────────┘
```

---

# 📱 Frontend Deployment (AWS Amplify)

## Prerequisites
- AWS Account with appropriate permissions
- GitHub repository with frontend code
- Domain name (optional)

## Step-by-Step Deployment

### 1. Prepare Frontend Code

Ensure your frontend has the correct configuration:

```typescript
// frontend/src/lib/constants/string.ts
const isCustomProduction = process.env.APP_ENV === 'production';

export const getBackendUrl = (): string => {
  if (isCustomProduction || process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
  }
  return 'http://localhost:3000';
};
```

### 2. Environment Configuration

Create environment variables for production:

```bash
# .env.local (for local development)
APP_ENV=production
NEXT_PUBLIC_BACKEND_URL=https://your-backend-api.cloudfront.net
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://your-domain.amplifyapp.com
```

### 3. Deploy to AWS Amplify

#### Option A: AWS Console
1. Go to AWS Amplify Console
2. Click "New app" → "Host web app"
3. Connect your GitHub repository
4. Configure build settings:

```yaml
# amplify.yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

5. Add environment variables in Amplify Console:
   - `NEXT_PUBLIC_BACKEND_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`

#### Option B: AWS CLI
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify project
amplify init

# Add hosting
amplify add hosting

# Deploy
amplify publish
```

### 4. Custom Domain (Optional)

1. In Amplify Console, go to "Domain management"
2. Add your custom domain
3. Verify domain ownership
4. Wait for SSL certificate provisioning

### 5. Environment Variables in Amplify

Set these environment variables in the Amplify Console:

```
APP_ENV=production
NEXT_PUBLIC_BACKEND_URL=https://d2oc9fk5wyihzt.cloudfront.net
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://main.d1d64zijwu2pjz.amplifyapp.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

---

# 🔧 Backend Deployment (AWS ECS Fargate)

## Prerequisites
- AWS CLI configured
- Docker installed
- ECR repository created
- VPC and security groups configured

## Step-by-Step Deployment

### 1. Container Preparation

#### Dockerfile
```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
WORKDIR /app
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

USER nestjs
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 2. Build and Push Container

```bash
# Build Docker image
docker build --platform linux/amd64 -t recruitment-backend .

# Login to ECR
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 229746606296.dkr.ecr.us-east-2.amazonaws.com

# Tag and push
docker tag recruitment-backend:latest 229746606296.dkr.ecr.us-east-2.amazonaws.com/recruitment-backend:latest
docker push 229746606296.dkr.ecr.us-east-2.amazonaws.com/recruitment-backend:latest
```

### 3. ECS Task Definition

```json
{
  "family": "recruitment-backend-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::229746606296:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "recruitment-backend",
      "image": "229746606296.dkr.ecr.us-east-2.amazonaws.com/recruitment-backend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-2:229746606296:secret:recruitment-db-credentials"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/recruitment-backend",
          "awslogs-region": "us-east-2",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### 4. Create ECS Service

```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create ECS cluster
aws ecs create-cluster --cluster-name recruitment-backend-cluster

# Create service
aws ecs create-service \
  --cluster recruitment-backend-cluster \
  --service-name recruitment-backend-service \
  --task-definition recruitment-backend-task:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-east-2:229746606296:targetgroup/recruitment-backend-tg/xxx,containerName=recruitment-backend,containerPort=3000
```

### 5. Application Load Balancer

```bash
# Create Application Load Balancer
aws elbv2 create-load-balancer \
  --name recruitment-backend-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx

# Create target group
aws elbv2 create-target-group \
  --name recruitment-backend-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxx \
  --target-type ip \
  --health-check-path /health
```

### 6. CloudFront Distribution

```json
{
  "CallerReference": "recruitment-backend-2025",
  "Comment": "recruitment-backend-api",
  "DefaultRootObject": "",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "recruitment-backend-alb",
        "DomainName": "recruitment-backend-alb-604348918.us-east-2.elb.amazonaws.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only",
          "OriginSslProtocols": {
            "Quantity": 3,
            "Items": ["TLSv1", "TLSv1.1", "TLSv1.2"]
          }
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "recruitment-backend-alb",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "ForwardedValues": {
      "QueryString": true,
      "Cookies": {"Forward": "all"},
      "Headers": {
        "Quantity": 4,
        "Items": ["Authorization", "Content-Type", "Origin", "Referer"]
      }
    },
    "DefaultTTL": 0,
    "MaxTTL": 0,
    "MinTTL": 0
  },
  "Enabled": true,
  "PriceClass": "PriceClass_100"
}
```

---

# 🗄️ Database Deployment (AWS RDS PostgreSQL)

## Prerequisites
- VPC with private subnets
- Security groups configured
- Database subnet group created

## Step-by-Step Deployment

### 1. Create Database Subnet Group

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name recruitment-db-subnet-group \
  --db-subnet-group-description "Subnet group for recruitment database" \
  --subnet-ids subnet-xxx subnet-yyy
```

### 2. Create RDS Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier recruitment-database \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 13.7 \
  --master-username postgres \
  --master-user-password YourSecurePassword123! \
  --allocated-storage 20 \
  --storage-type gp2 \
  --vpc-security-group-ids sg-xxx \
  --db-subnet-group-name recruitment-db-subnet-group \
  --backup-retention-period 7 \
  --storage-encrypted \
  --deletion-protection \
  --enable-performance-insights
```

### 3. Database Schema Setup

Run the migration scripts in order:

```sql
-- 01_user.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'recruiter',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 02_applications.sql
CREATE TABLE application_forms (
    id SERIAL PRIMARY KEY,
    staff_id UUID REFERENCES staff(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 03_interview.sql
CREATE TABLE interviews (
    id SERIAL PRIMARY KEY,
    applicant_id UUID NOT NULL,
    interviewer_id UUID REFERENCES staff(id),
    scheduled_at TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. SSL Configuration

Enable SSL connections:

```sql
-- Check SSL status
SHOW ssl;

-- Require SSL for connections
ALTER SYSTEM SET ssl = on;
SELECT pg_reload_conf();
```

### 5. Connection String Format

```bash
# Environment variable format
DATABASE_URL=postgresql://username:password@hostname:5432/database?sslmode=require

# Example
DATABASE_URL=postgresql://postgres:YourPassword@recruitment-database.xxx.us-east-2.rds.amazonaws.com:5432/postgres?sslmode=require
```

---

# 🔐 Security Configuration

## Environment Variables and Secrets

### AWS Secrets Manager

Store sensitive configuration in AWS Secrets Manager:

```bash
# Create database credentials secret
aws secretsmanager create-secret \
  --name recruitment-db-credentials \
  --description "Database credentials for recruitment app" \
  --secret-string '{"username":"postgres","password":"YourSecurePassword123!","host":"recruitment-database.xxx.us-east-2.rds.amazonaws.com","port":"5432","database":"postgres"}'

# Create application secrets
aws secretsmanager create-secret \
  --name recruitment-app-secrets \
  --description "Application secrets for recruitment app" \
  --secret-string '{"NEXTAUTH_SECRET":"your-nextauth-secret","SMTP_PASSWORD":"your-smtp-password"}'
```

## Security Groups

### Backend Security Group
```bash
# Allow HTTP from ALB
aws ec2 authorize-security-group-ingress \
  --group-id sg-backend \
  --protocol tcp \
  --port 3000 \
  --source-group sg-alb

# Allow HTTPS outbound
aws ec2 authorize-security-group-egress \
  --group-id sg-backend \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

### Database Security Group
```bash
# Allow PostgreSQL from backend only
aws ec2 authorize-security-group-ingress \
  --group-id sg-database \
  --protocol tcp \
  --port 5432 \
  --source-group sg-backend
```

---

# 🚀 Deployment Scripts

## Complete Deployment Script

```bash
#!/bin/bash
set -e

echo "🚀 Starting Recruitment App Deployment"

# Variables
AWS_REGION="us-east-2"
AWS_ACCOUNT_ID="229746606296"
ECR_REPO="recruitment-backend"
CLUSTER_NAME="recruitment-backend-cluster"
SERVICE_NAME="recruitment-backend-service"

# Build and push Docker image
echo "📦 Building and pushing Docker image..."
docker build --platform linux/amd64 -t $ECR_REPO .
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
docker tag $ECR_REPO:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest

# Update ECS service
echo "🔄 Updating ECS service..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --force-new-deployment

# Wait for deployment
echo "⏳ Waiting for deployment to complete..."
aws ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME

echo "✅ Deployment complete!"
```

## Health Check Script

```bash
#!/bin/bash

# Health check endpoints
HEALTH_URL="https://d2oc9fk5wyihzt.cloudfront.net/health"
API_URL="https://d2oc9fk5wyihzt.cloudfront.net/api/forms/feed"
FRONTEND_URL="https://main.d1d64zijwu2pjz.amplifyapp.com"

echo "🏥 Running health checks..."

# Check backend health
if curl -s $HEALTH_URL | grep -q "OK"; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    exit 1
fi

# Check API endpoint
if curl -s $API_URL | grep -q "feed"; then
    echo "✅ API endpoint check passed"
else
    echo "❌ API endpoint check failed"
    exit 1
fi

# Check frontend
if curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL | grep -q "200"; then
    echo "✅ Frontend check passed"
else
    echo "❌ Frontend check failed"
    exit 1
fi

echo "🎉 All health checks passed!"
```

---

# 📊 Monitoring and Maintenance

## CloudWatch Monitoring

### Key Metrics to Monitor
- ECS Service CPU/Memory utilization
- ALB target health
- RDS connections and performance
- CloudFront cache hit ratio

### Alarms Setup
```bash
# CPU utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "recruitment-backend-high-cpu" \
  --alarm-description "High CPU utilization" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

## Backup Strategy

### RDS Automated Backups
- Point-in-time recovery enabled
- 7-day backup retention
- Cross-region backup replication (optional)

### Application Data Backup
```bash
# Database backup script
pg_dump -h recruitment-database.xxx.us-east-2.rds.amazonaws.com \
        -U postgres \
        -d postgres \
        --no-password \
        -f backup_$(date +%Y%m%d_%H%M%S).sql
```

---

# 🔧 Troubleshooting

## Common Issues

### CORS Errors
- Check CloudFront distribution allows all HTTP methods
- Verify backend CORS configuration includes frontend domain
- Ensure OPTIONS requests are properly handled

### Database Connection Issues
- Verify security groups allow traffic from ECS to RDS
- Check SSL certificate configuration
- Validate connection string format

### Container Health Check Failures
- Ensure `/health` endpoint is implemented
- Check container logs in CloudWatch
- Verify port mapping in task definition

## Useful Commands

```bash
# Check ECS service status
aws ecs describe-services --cluster recruitment-backend-cluster --services recruitment-backend-service

# View container logs
aws logs get-log-events --log-group-name /ecs/recruitment-backend --log-stream-name ecs/recruitment-backend/task-id

# Test database connection
psql postgresql://username:password@host:5432/database?sslmode=require

# CloudFront cache invalidation
aws cloudfront create-invalidation --distribution-id E1QSTLBD7HYXOA --paths "/*"
```

---

# 📋 Deployment Checklist

## Pre-Deployment
- [ ] Code reviewed and tested
- [ ] Environment variables configured
- [ ] Docker image builds successfully
- [ ] Database migrations prepared
- [ ] SSL certificates valid

## Deployment
- [ ] Docker image pushed to ECR
- [ ] ECS service updated
- [ ] CloudFront distribution configured
- [ ] Health checks passing
- [ ] CORS configuration verified

## Post-Deployment
- [ ] End-to-end testing completed
- [ ] Monitoring dashboards configured
- [ ] Backup verification
- [ ] Performance testing
- [ ] Security scan completed

---

# 🎯 Current Production Configuration

## Live URLs
- **Frontend**: https://main.d1d64zijwu2pjz.amplifyapp.com
- **Backend API**: https://d2oc9fk5wyihzt.cloudfront.net
- **Health Check**: https://d2oc9fk5wyihzt.cloudfront.net/health

## Infrastructure
- **CloudFront Distribution**: d2oc9fk5wyihzt.cloudfront.net
- **ECS Cluster**: recruitment-backend-cluster
- **RDS Instance**: recruitment-database (PostgreSQL 13.7)
- **ECR Repository**: 229746606296.dkr.ecr.us-east-2.amazonaws.com/recruitment-backend

**Last Updated**: July 6, 2025  
**Status**: ✅ PRODUCTION READY
