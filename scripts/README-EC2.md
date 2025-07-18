# EC2 Backend Deployment Guide

This guide explains how to deploy the recruitment website backend to a dedicated EC2 instance with automatic scaling, load balancing, and monitoring.

## 🚀 Quick Start

### Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **Docker** installed locally (for building)
3. **Node.js 18+** for local builds
4. **SSH access** to your AWS account

### One-Command Deployment

```bash
# Deploy everything to EC2
./scripts/deploy-ec2.sh

# Or with custom parameters
./scripts/deploy-ec2.sh --region us-west-2 --instance-type t3.medium
```

## 📋 What Gets Created

The deployment script creates:

- **EC2 Instance** (t3.small by default) with Docker and Node.js
- **Security Group** with ports 22, 80, 443, 3000 open
- **Application Load Balancer** for high availability
- **Target Group** with health checks
- **SSH Key Pair** for secure access
- **CloudWatch** monitoring and logging
- **Auto-deployment** via systemd service

## 🔧 Configuration

### Environment Variables

Copy the template and customize:

```bash
cp backend/.env.ec2.template backend/.env.production
```

**Required Variables:**
```bash
DATABASE_URL=postgresql://admin:PASSWORD@your-db-host:5432/postgres
JWT_SECRET=your-secure-jwt-secret-32-chars-minimum
SMTP_PASSWORD=your-email-app-password
```

### AWS Configuration

Set your preferred defaults:

```bash
export AWS_REGION=us-east-2
export INSTANCE_TYPE=t3.small
export KEY_NAME=recruitment-backend-key
```

## 🛠️ Management Commands

### Instance Management

```bash
# Start/stop/restart instance
./scripts/manage-ec2.sh start
./scripts/manage-ec2.sh stop
./scripts/manage-ec2.sh restart

# Check status
./scripts/manage-ec2.sh status

# SSH into instance
./scripts/manage-ec2.sh ssh
```

### Application Management

```bash
# Deploy new version
./scripts/manage-ec2.sh deploy

# View logs
./scripts/manage-ec2.sh logs

# Check costs
./scripts/manage-ec2.sh costs
```

### Health Monitoring

```bash
# Basic health check
./scripts/monitor-ec2.sh check

# View recent logs
./scripts/monitor-ec2.sh logs

# Generate health report
./scripts/monitor-ec2.sh report

# Continuous monitoring
./scripts/monitor-ec2.sh watch

# Restart services if unhealthy
./scripts/monitor-ec2.sh restart
```

## 🌐 Access Your Backend

After deployment, your backend will be accessible at:

- **Direct Instance**: `http://YOUR-INSTANCE-IP:3000`
- **Load Balancer**: `http://YOUR-ALB-DNS`
- **Health Check**: `http://YOUR-ALB-DNS/health`

The deployment script will display these URLs at the end.

## 📊 Architecture Overview

```
Internet
    ↓
Application Load Balancer (ALB)
    ↓
EC2 Instance (t3.small)
├── Docker Compose
│   ├── Backend App (Node.js)
│   ├── PostgreSQL Database
│   └── Redis Cache
├── CloudWatch Agent
└── Systemd Service
```

### Instance Configuration

The EC2 instance is configured with:

- **Amazon Linux 2** AMI
- **Docker & Docker Compose** for containerization
- **Node.js 18** for building
- **CloudWatch Agent** for monitoring
- **Systemd Service** for auto-restart
- **Security hardening** with non-root user

## 🔒 Security Features

### Network Security

- **Security Group** restricts access to necessary ports only
- **SSH access** via key pair authentication
- **HTTPS ready** (ports 80/443 open for SSL setup)

### Application Security

- **Environment variables** for sensitive data
- **Docker containers** for isolation
- **Non-root execution** for security
- **Health checks** for availability

### Monitoring

- **CloudWatch metrics** (CPU, memory, disk)
- **Application logs** centralized
- **Health endpoint** monitoring
- **Automated alerts** (configurable)

## 💰 Cost Optimization

### Instance Sizing

| Instance Type | vCPU | Memory | Monthly Cost* |
|---------------|------|--------|---------------|
| t3.micro      | 2    | 1 GB   | ~$8-12        |
| t3.small      | 2    | 2 GB   | ~$15-20       |
| t3.medium     | 2    | 4 GB   | ~$30-40       |

*Approximate costs for us-east-2 region

### Cost Monitoring

```bash
# Check current costs
./scripts/manage-ec2.sh costs

# Enable detailed billing in AWS console
# Set up cost alerts for your budget
```

## 🚨 Troubleshooting

### Common Issues

**1. Instance Won't Start**
```bash
# Check instance status
./scripts/manage-ec2.sh status

# Check AWS console for detailed errors
aws ec2 describe-instances --instance-ids YOUR-INSTANCE-ID
```

**2. Application Not Responding**
```bash
# Check application logs
./scripts/manage-ec2.sh logs

# Restart services
./scripts/monitor-ec2.sh restart

# SSH and check manually
./scripts/manage-ec2.sh ssh
```

**3. Health Checks Failing**
```bash
# Generate health report
./scripts/monitor-ec2.sh report

# Check load balancer target health
aws elbv2 describe-target-health --target-group-arn YOUR-TG-ARN
```

**4. High Costs**
```bash
# Check resource usage
./scripts/monitor-ec2.sh check

# Consider stopping instance when not needed
./scripts/manage-ec2.sh stop
```

### Manual Debugging

SSH into the instance for manual debugging:

```bash
./scripts/manage-ec2.sh ssh

# Once connected:
cd /opt/recruitment-backend

# Check Docker containers
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs app

# Check systemd service
sudo systemctl status recruitment-backend

# Test health endpoint
curl http://localhost:3000/health
```

## 🔄 Deployment Workflow

### Initial Deployment

1. **Run deployment script**: `./scripts/deploy-ec2.sh`
2. **Configure environment**: Update `.env.production`
3. **Test health**: Check endpoints
4. **Update frontend**: Point to new backend URL

### Updates and Maintenance

```bash
# For application updates
./scripts/manage-ec2.sh deploy

# For infrastructure changes
./scripts/deploy-ec2.sh  # Re-run deployment

# For monitoring
./scripts/monitor-ec2.sh watch
```

### Scaling Options

**Vertical Scaling** (Upgrade instance):
```bash
# Stop instance
./scripts/manage-ec2.sh stop

# Change instance type in AWS console
# Or modify script and redeploy

# Start instance
./scripts/manage-ec2.sh start
```

**Horizontal Scaling** (Multiple instances):
- Requires modification of deployment script
- Add Auto Scaling Group
- Configure multiple target group targets

## 🧹 Cleanup

**⚠️ WARNING: This will delete ALL resources**

```bash
# Delete everything
./scripts/manage-ec2.sh cleanup
```

This removes:
- EC2 instance
- Load balancer
- Target group
- Security group
- SSH key pair
- All data and configurations

## 📚 Additional Resources

### AWS Documentation

- [EC2 User Guide](https://docs.aws.amazon.com/ec2/)
- [Application Load Balancer Guide](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)
- [CloudWatch User Guide](https://docs.aws.amazon.com/cloudwatch/)

### Best Practices

- **Regular backups** of application data
- **SSL certificate** setup for HTTPS
- **Auto Scaling Group** for production
- **RDS** for managed database
- **CloudFormation** for infrastructure as code

### Support

For issues with this deployment:

1. Check the troubleshooting section above
2. Review CloudWatch logs
3. Verify AWS permissions
4. Check AWS service status

---

**Built with ❤️ for the Recruitment Website Project**