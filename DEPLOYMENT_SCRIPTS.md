# Backend Deployment Scripts

This document describes the deployment scripts for the Recruitment Website backend.

## 📋 Overview

The deployment system consists of several scripts that help automate the deployment process:

- **`deploy-backend.sh`** - Main deployment script with full functionality
- **`deploy.sh`** - Simple wrapper script that loads configuration
- **`deployment-config.env`** - Configuration file for deployment settings

## 🚀 Quick Start

### 1. Basic Deployment to AWS

```bash
# Deploy to AWS ECS (full process)
./deploy.sh deploy-aws

# Or using the main script directly
./deploy-backend.sh deploy-aws
```

### 2. Local Development Deployment

```bash
# Deploy locally with Docker
./deploy.sh deploy-local

# Check local deployment status
./deploy.sh status local
```

### 3. Build Only

```bash
# Build application and Docker image
./deploy.sh build
```

## 🛠 Available Commands

### Main Commands

| Command | Description | Example |
|---------|-------------|---------|
| `build` | Build application and Docker image | `./deploy.sh build` |
| `deploy-local` | Deploy to local Docker environment | `./deploy.sh deploy-local` |
| `deploy-aws` | Deploy to AWS ECS | `./deploy.sh deploy-aws` |
| `status` | Show deployment status | `./deploy.sh status aws` |
| `logs` | Show deployment logs | `./deploy.sh logs local` |
| `health` | Check deployment health | `./deploy.sh health https://api.example.com` |
| `cleanup` | Clean up Docker resources | `./deploy.sh cleanup all` |
| `help` | Show help message | `./deploy.sh help` |

### Status Commands

```bash
# Check AWS ECS deployment status
./deploy.sh status aws

# Check local Docker deployment status
./deploy.sh status local
```

### Log Commands

```bash
# Show local Docker logs
./deploy.sh logs local

# Show AWS logs (requires CloudWatch setup)
./deploy.sh logs aws
```

### Health Check Commands

```bash
# Check production deployment health
./deploy.sh health https://d2oc9fk5wyihzt.cloudfront.net

# Check local deployment health
./deploy.sh health http://localhost:3000
```

## ⚙️ Configuration

### Environment Variables

Create or edit `./backend/.env.production` with your configuration:

```env
# Application Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://admin:password@your-db-host:5432/recruitment_db

# Security Configuration
JWT_SECRET=your-strong-jwt-secret-key
CORS_ORIGIN=https://your-frontend-domain.com

# Logging Configuration
LOG_LEVEL=info
```

### Deployment Configuration

Edit `deployment-config.env` to customize deployment settings:

```env
# Docker Configuration
DOCKER_IMAGE_NAME=recruitment-backend
DOCKER_PLATFORM=linux/amd64

# AWS Configuration
AWS_REGION=us-east-2
AWS_ACCOUNT_ID=229746606296
ECR_REPOSITORY_NAME=recruitment-backend
ECS_CLUSTER_NAME=recruitment-backend-cluster
ECS_SERVICE_NAME=recruitment-backend-service

# Application Configuration
BACKEND_DIR=./backend
ENVIRONMENT=production
PORT=3000

# Health Check Configuration
HEALTH_CHECK_URL=https://d2oc9fk5wyihzt.cloudfront.net/health
HEALTH_CHECK_TIMEOUT=60
```

## 🔧 Command Options

The deployment script supports various options:

```bash
./deploy-backend.sh [COMMAND] [OPTIONS]
```

### Available Options

| Option | Description | Default |
|--------|-------------|---------|
| `--backend-dir DIR` | Backend directory | `./backend` |
| `--image-name NAME` | Docker image name | `recruitment-backend` |
| `--aws-region REGION` | AWS region | `us-east-2` |
| `--cluster-name NAME` | ECS cluster name | `recruitment-backend-cluster` |
| `--service-name NAME` | ECS service name | `recruitment-backend-service` |
| `--environment ENV` | Environment | `production` |

### Examples with Options

```bash
# Deploy with custom settings
./deploy-backend.sh deploy-aws --aws-region us-west-2 --cluster-name my-cluster

# Build with custom backend directory
./deploy-backend.sh build --backend-dir ./my-backend

# Check health with custom URL
./deploy-backend.sh health https://my-api.example.com
```

## 📊 Deployment Process

### Full AWS Deployment Process

When you run `./deploy.sh deploy-aws`, the script performs these steps:

1. **Prerequisites Check**
   - Verifies Docker installation
   - Checks AWS CLI configuration
   - Validates backend directory structure

2. **Environment Setup**
   - Creates `.env.production` if missing
   - Validates environment variables

3. **Application Build**
   - Installs npm dependencies
   - Compiles TypeScript to JavaScript
   - Validates build output

4. **Testing**
   - Runs application tests (if available)
   - Validates build integrity

5. **Docker Image Build**
   - Builds Docker image for AMD64 platform
   - Tests Docker image functionality

6. **AWS Deployment**
   - Logs into AWS ECR
   - Tags and pushes image to ECR
   - Updates ECS service with new image
   - Waits for deployment to stabilize

7. **Health Check**
   - Verifies deployment is healthy
   - Confirms API endpoints are responding

### Local Deployment Process

When you run `./deploy.sh deploy-local`, the script performs:

1. **Prerequisites Check**
2. **Environment Setup**
3. **Application Build**
4. **Docker Image Build**
5. **Local Container Deployment**
   - Stops existing container
   - Starts new container with updated image
   - Exposes port 3000
6. **Health Check**
   - Verifies local deployment is working

## 🔍 Monitoring and Troubleshooting

### Check Deployment Status

```bash
# Check AWS deployment
./deploy.sh status aws

# Check local deployment
./deploy.sh status local
```

### View Logs

```bash
# View local Docker logs
./deploy.sh logs local

# View recent logs with tail
docker logs recruitment-backend --tail 50 --follow
```

### Health Checks

```bash
# Check production health
./deploy.sh health https://d2oc9fk5wyihzt.cloudfront.net

# Check local health
./deploy.sh health http://localhost:3000

# Manual health check
curl -f https://d2oc9fk5wyihzt.cloudfront.net/health
```

### Common Issues and Solutions

#### 1. Docker Build Fails

```bash
# Check Docker is running
docker info

# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker build --no-cache --platform linux/amd64 -t recruitment-backend ./backend
```

#### 2. AWS Deployment Fails

```bash
# Check AWS credentials
aws sts get-caller-identity

# Check ECR authentication
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 229746606296.dkr.ecr.us-east-2.amazonaws.com

# Check ECS service status
aws ecs describe-services --cluster recruitment-backend-cluster --services recruitment-backend-service --region us-east-2
```

#### 3. Health Check Fails

```bash
# Check container logs
docker logs recruitment-backend

# Check ECS task logs (in CloudWatch)
aws logs describe-log-groups --region us-east-2

# Test API endpoints manually
curl -v https://d2oc9fk5wyihzt.cloudfront.net/health
```

## 🧹 Cleanup

### Clean Local Resources

```bash
# Clean up all Docker resources
./deploy.sh cleanup all

# Clean up containers only
./deploy.sh cleanup
```

### Manual Cleanup

```bash
# Stop and remove local container
docker stop recruitment-backend
docker rm recruitment-backend

# Remove Docker images
docker rmi recruitment-backend:latest
docker rmi 229746606296.dkr.ecr.us-east-2.amazonaws.com/recruitment-backend:latest

# Clean Docker system
docker system prune -a
```

## 🎯 Best Practices

### 1. Environment Management

- Always use separate `.env.production` for production
- Never commit environment files to version control
- Use strong, unique secrets for production

### 2. Deployment Safety

- Test locally before deploying to AWS
- Use health checks to verify deployments
- Monitor logs during deployment

### 3. Security

- Use HTTPS for all production endpoints
- Configure CORS properly
- Keep dependencies updated

### 4. Monitoring

- Set up CloudWatch alarms for ECS services
- Monitor application logs regularly
- Use health checks in load balancers

## 📚 Additional Resources

### Current Production URLs

- **Backend API**: https://d2oc9fk5wyihzt.cloudfront.net
- **Health Check**: https://d2oc9fk5wyihzt.cloudfront.net/health
- **Frontend**: https://main.d1d64zijwu2pjz.amplifyapp.com

### AWS Resources

- **ECR Repository**: `229746606296.dkr.ecr.us-east-2.amazonaws.com/recruitment-backend`
- **ECS Cluster**: `recruitment-backend-cluster`
- **ECS Service**: `recruitment-backend-service`
- **RDS Database**: `recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com`

### Useful Commands

```bash
# Check running containers
docker ps

# View all images
docker images

# AWS ECS CLI commands
aws ecs list-clusters
aws ecs list-services --cluster recruitment-backend-cluster
aws ecs describe-services --cluster recruitment-backend-cluster --services recruitment-backend-service

# CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix /ecs/recruitment-backend
```

## 🔧 Customization

The deployment scripts can be easily customized for different environments or requirements:

1. **Different AWS Regions**: Update `AWS_REGION` in configuration
2. **Different ECS Settings**: Modify cluster and service names
3. **Custom Docker Settings**: Change image names and build options
4. **Additional Health Checks**: Add more endpoint testing
5. **Pre/Post Deployment Hooks**: Add custom scripts before/after deployment

The scripts are designed to be modular and extensible for future enhancements.