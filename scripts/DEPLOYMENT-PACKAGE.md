# Complete EC2 Deployment Package for Recruitment Backend

*Generated: July 20, 2025*

This package contains everything needed to deploy the recruitment backend to an EC2 instance, replacing the broken ECS infrastructure.

---

## 📦 **Package Contents**

### **Core Deployment Scripts**
- `deploy-ec2.sh` - Main EC2 instance deployment and ALB setup
- `manage-ec2.sh` - Instance management (start/stop/deploy/status)
- `monitor-ec2.sh` - Health monitoring and alerting

### **Infrastructure Configuration**
- `docker-compose.ec2.yml` - Production Docker Compose with all services
- `.env.production.template` - Environment variables template
- `setup-env.sh` - Environment configuration and secret generation

### **Web Server & SSL**
- `nginx.conf` - Nginx configuration with rate limiting and SSL
- `setup-ssl.sh` - Let's Encrypt SSL certificate automation
- `recruitment-backend.service` - Systemd service configuration

### **Monitoring & Logging**
- `cloudwatch-config.json` - CloudWatch agent configuration
- `setup-cloudwatch.sh` - CloudWatch agent installation and setup

### **Database Management**
- `init-database.sh` - Database schema initialization script
- `backend/postgres-init/` - SQL schema files (01-05)

---

## 🚀 **Quick Deployment Guide**

### **Step 1: Initial AWS Setup**
```bash
# 1. Configure AWS CLI
aws configure

# 2. Deploy EC2 infrastructure
chmod +x scripts/*.sh
./scripts/deploy-ec2.sh

# This creates:
# - EC2 instance with Docker
# - Application Load Balancer
# - Security groups and networking
# - CloudFront distribution
```

### **Step 2: Database Setup**
```bash
# Initialize the production database
DB_PASSWORD=your_db_password ./scripts/init-database.sh

# Verify database connectivity
psql -h recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com \
     -U admin -d postgres -c "SELECT COUNT(*) FROM staff;"
```

### **Step 3: Application Deployment**
```bash
# SSH to EC2 instance (IP from deploy-ec2.sh output)
ssh -i ~/.ssh/recruitment-ec2-key.pem ec2-user@<EC2_INSTANCE_IP>

# Clone repository
git clone https://github.com/user/RecruitmentWebsite.git recruitment-app
cd recruitment-app

# Set up environment
./scripts/setup-env.sh

# Start all services
docker-compose -f docker-compose.ec2.yml up -d

# Set up systemd service
sudo cp scripts/recruitment-backend.service /etc/systemd/system/
sudo systemctl enable recruitment-backend
sudo systemctl start recruitment-backend
```

### **Step 4: SSL & Monitoring Setup**
```bash
# Set up SSL certificates
DOMAIN=your-domain.com ./scripts/setup-ssl.sh

# Set up CloudWatch monitoring
CREATE_IAM_ROLE=true ./scripts/setup-cloudwatch.sh

# Configure nginx
sudo cp scripts/nginx.conf /etc/nginx/sites-available/recruitment-backend
sudo ln -s /etc/nginx/sites-available/recruitment-backend /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

---

## ⚙️ **Configuration Requirements**

### **Required Environment Variables**
```bash
# Copy and modify the template
cp .env.production.template .env.production

# Required variables:
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://admin:PASSWORD@recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com:5432/postgres
JWT_SECRET=generated_secret_from_setup_script
FRONTEND_URL=https://main.d1d64zijwu2pjz.amplifyapp.com
CORS_ORIGIN=https://main.d1d64zijwu2pjz.amplifyapp.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=internal.software@dreamteameng.org
SMTP_PASSWORD=your_smtp_password
```

### **AWS Permissions Required**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:*",
        "elasticloadbalancing:*",
        "cloudfront:*",
        "route53:*",
        "logs:*",
        "cloudwatch:*"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 📋 **Deployment Checklist**

### **Pre-Deployment**
- [ ] AWS CLI configured with appropriate permissions
- [ ] Domain name configured (optional, for SSL)
- [ ] SMTP credentials obtained
- [ ] RDS database accessible
- [ ] ECR repository available (229746606296.dkr.ecr.us-east-2.amazonaws.com/recruitment-backend)

### **Infrastructure Deployment**
- [ ] EC2 instance created and running
- [ ] Application Load Balancer configured
- [ ] Security groups allow HTTP/HTTPS traffic
- [ ] CloudFront distribution created
- [ ] Health checks passing

### **Application Deployment**
- [ ] Repository cloned to EC2 instance
- [ ] Environment variables configured
- [ ] Docker images built and running
- [ ] Database schema initialized
- [ ] Systemd service configured and running

### **Security & Monitoring**
- [ ] SSL certificates installed and auto-renewing
- [ ] Nginx configured with rate limiting
- [ ] CloudWatch agent installed and reporting
- [ ] Log groups created in CloudWatch
- [ ] Health monitoring script scheduled

### **Testing & Verification**
- [ ] Health endpoint responding: `curl https://your-domain.com/health`
- [ ] HTTPS redirect working: `curl -I http://your-domain.com`
- [ ] API endpoints accessible
- [ ] Frontend can connect to backend
- [ ] Staff registration/login working
- [ ] Form creation and submission working

---

## 🔧 **Management Commands**

### **Instance Management**
```bash
# Start instance and services
./scripts/manage-ec2.sh start

# Deploy application updates
./scripts/manage-ec2.sh deploy

# Check service status
./scripts/manage-ec2.sh status

# Stop services (keeps instance running)
./scripts/manage-ec2.sh stop

# Monitor health
./scripts/monitor-ec2.sh
```

### **Application Management**
```bash
# View logs
docker-compose -f docker-compose.ec2.yml logs -f app

# Restart application
sudo systemctl restart recruitment-backend

# Update to latest code
git pull origin main
docker-compose -f docker-compose.ec2.yml build app
docker-compose -f docker-compose.ec2.yml up -d app
```

### **Database Management**
```bash
# Connect to database
psql -h recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com \
     -U admin -d postgres

# Run migrations
./scripts/init-database.sh

# Backup database
pg_dump -h recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com \
        -U admin postgres > backup.sql
```

---

## 🔍 **Troubleshooting Guide**

### **Common Issues**

**1. Health Check Failing**
```bash
# Check application logs
docker-compose -f docker-compose.ec2.yml logs app

# Check nginx status
sudo systemctl status nginx

# Test database connection
psql -h recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com \
     -U admin -d postgres -c "SELECT 1;"
```

**2. SSL Certificate Issues**
```bash
# Check certificate status
sudo certbot certificates

# Test SSL connection
openssl s_client -connect your-domain.com:443

# View nginx error logs
sudo tail -f /var/log/nginx/error.log
```

**3. Application Not Starting**
```bash
# Check environment variables
cat .env.production

# Check Docker logs
docker-compose -f docker-compose.ec2.yml logs

# Check systemd service
sudo journalctl -u recruitment-backend -f
```

**4. Database Connection Issues**
```bash
# Test database connection
nc -zv recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com 5432

# Check security groups
aws ec2 describe-security-groups --group-ids sg-your-group-id

# Verify DATABASE_URL format
echo $DATABASE_URL
```

---

## 📊 **Resource Usage & Scaling**

### **Current Resource Allocation**
- **EC2 Instance**: t3.medium (2 vCPU, 4GB RAM)
- **Disk Space**: 20GB SSD
- **Network**: Enhanced networking enabled
- **Database**: db.t3.micro (1 vCPU, 1GB RAM)

### **Scaling Considerations**
- **Horizontal Scaling**: Add more EC2 instances behind ALB
- **Vertical Scaling**: Upgrade to larger EC2 instance types
- **Database Scaling**: Upgrade RDS instance or add read replicas
- **CDN**: CloudFront already provides global distribution

### **Cost Optimization**
- **Reserved Instances**: Consider for long-term deployment
- **Auto Scaling**: Configure based on CloudWatch metrics
- **Spot Instances**: For non-critical workloads
- **Log Retention**: Configure appropriate retention periods

---

## 🔒 **Security Considerations**

### **Implemented Security Measures**
- SSL/TLS encryption with Let's Encrypt
- Nginx rate limiting for API protection
- Security headers (HSTS, XSS protection)
- VPC security groups restricting access
- Non-root Docker containers
- Automated security updates

### **Additional Security Recommendations**
- Enable AWS GuardDuty for threat detection
- Configure AWS WAF for additional protection
- Set up VPC Flow Logs for network monitoring
- Implement AWS Config for compliance monitoring
- Use AWS Secrets Manager for sensitive data

---

## 📞 **Support & Maintenance**

### **Monitoring Dashboard**
- **CloudWatch**: https://us-east-2.console.aws.amazon.com/cloudwatch/
- **EC2 Console**: https://us-east-2.console.aws.amazon.com/ec2/
- **ALB Console**: https://us-east-2.console.aws.amazon.com/ec2/v2/home#LoadBalancers

### **Log Locations**
- **Application**: `/var/log/recruitment/`
- **Nginx Access**: `/var/log/nginx/recruitment-backend.access.log`
- **Nginx Error**: `/var/log/nginx/recruitment-backend.error.log`
- **System**: `/var/log/messages`
- **CloudWatch**: `/aws/ec2/recruitment-backend/` log groups

### **Regular Maintenance Tasks**
- Monitor SSL certificate expiration (automated)
- Review CloudWatch logs for errors
- Update Docker images regularly
- Apply security patches to EC2 instance
- Monitor resource utilization
- Review and rotate access keys

---

## 🎯 **Production Readiness Checklist**

### **Critical (Required for Production)**
- [ ] SSL certificates configured and auto-renewing
- [ ] Environment variables properly secured
- [ ] Database backups configured
- [ ] Health monitoring alerts set up
- [ ] Log retention policies configured

### **Important (Recommended for Production)**
- [ ] Auto-scaling policies configured
- [ ] Disaster recovery plan documented
- [ ] Monitoring dashboard set up
- [ ] Performance baseline established
- [ ] Security scan completed

### **Nice to Have (Future Enhancements)**
- [ ] Blue/green deployment pipeline
- [ ] Automated testing in CI/CD
- [ ] Performance monitoring tools
- [ ] Advanced security monitoring
- [ ] Multi-region deployment

---

**🎉 Your recruitment backend is now ready for production deployment on EC2!**

*For questions or issues, refer to the troubleshooting guide or check the CloudWatch logs.*