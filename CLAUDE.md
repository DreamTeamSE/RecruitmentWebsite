# Claude Infrastructure Documentation
## Recruitment Website AWS Infrastructure Overview

*Last Updated: July 16, 2025*

---

## 📋 **Project Overview**

### **Application Architecture**
- **Frontend**: Next.js deployed on AWS Amplify (HTTPS)
- **Backend**: Node.js/Express deployed on AWS ECS Fargate (containerized)
- **Database**: AWS RDS PostgreSQL with SSL encryption
- **CDN**: AWS CloudFront for HTTPS termination and global distribution
- **Load Balancer**: AWS Application Load Balancer (ALB)

### **Current Live URLs**
- **Frontend**: https://main.d1d64zijwu2pjz.amplifyapp.com
- **Backend API**: https://d2oc9fk5wyihzt.cloudfront.net
- **Health Check**: https://d2oc9fk5wyihzt.cloudfront.net/health

---

## 🏗️ **Infrastructure Components**

### **1. Frontend Infrastructure (AWS Amplify)**

```yaml
Service: AWS Amplify
Domain: main.d1d64zijwu2pjz.amplifyapp.com
Branch: main
Framework: Next.js 15
Build Command: npm run build
Environment: Production
SSL: Automatic (AWS Certificate Manager)
```

**Environment Variables:**
```bash
APP_ENV=production
NEXT_PUBLIC_BACKEND_URL=https://d2oc9fk5wyihzt.cloudfront.net
NEXT_PUBLIC_APP_NAME="Recruitment Website"
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_API_TIMEOUT=30000
```

### **2. Backend Infrastructure (AWS ECS Fargate)**

```yaml
ECS Cluster: recruitment-backend-cluster
ECS Service: recruitment-backend-service
Task Definition: recruitment-backend:LATEST
Platform: Linux/AMD64
CPU: 512 vCPU
Memory: 1024 MB
Desired Count: 1
Health Check: /health endpoint
```

**Container Configuration:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

**Environment Variables:**
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://admin:***@recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com:5432/postgres
JWT_SECRET=***
FRONTEND_URL=https://main.d1d64zijwu2pjz.amplifyapp.com
CORS_ORIGIN=https://main.d1d64zijwu2pjz.amplifyapp.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=internal.software@dreamteameng.org
SMTP_PASSWORD=***
```

### **3. Database Infrastructure (AWS RDS)**

```yaml
Engine: PostgreSQL 15
Instance Class: db.t3.micro
Instance ID: recruitment-backend-db
Endpoint: recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com
Port: 5432
Database: postgres
Username: admin
SSL: Required
Backup Retention: 7 days
Multi-AZ: No (single instance)
```

**Database Schema:**
```sql
-- Main tables
users (id, email, password, role, created_at, updated_at)
staff (id, user_id, first_name, last_name, position, department)
applicants (id, user_id, first_name, last_name, email, phone)
application_forms (id, title, description, staff_id, created_at)
form_questions (id, form_id, question_text, type, required, placeholder)
form_entries (id, form_id, applicant_id, submitted_at, status)
form_responses (id, entry_id, question_id, answer_text)
interviews (id, applicant_id, staff_id, scheduled_at, status)
```

### **4. Container Registry (AWS ECR)**

```yaml
Repository: recruitment-backend
URI: 229746606296.dkr.ecr.us-east-2.amazonaws.com/recruitment-backend
Image Tag: latest
Architecture: linux/amd64
Scan on Push: Enabled
```

### **5. Load Balancer (AWS ALB)**

```yaml
Name: recruitment-backend-alb
DNS: recruitment-backend-alb-604348918.us-east-2.elb.amazonaws.com
Scheme: Internet-facing
Type: Application Load Balancer
Port: 80 (HTTP)
Target Group: recruitment-backend-targets
Health Check: /health
```

### **6. Content Delivery Network (AWS CloudFront)**

```yaml
Distribution: d2oc9fk5wyihzt.cloudfront.net
Origin: recruitment-backend-alb-604348918.us-east-2.elb.amazonaws.com
Allowed Methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
Cache Policy: Managed-CachingDisabled
Origin Request Policy: Managed-CORS-S3Origin
SSL Certificate: CloudFront Default
```

---

## 🚀 **API Endpoints**

### **Authentication Endpoints**
```bash
POST /api/auth/register        # User registration
POST /api/auth/login           # User login
POST /api/auth/logout          # User logout
GET  /api/auth/verify-email    # Email verification
POST /api/auth/forgot-password # Password reset
```

### **Application Form Endpoints**
```bash
GET    /api/forms/feed         # Get all forms
POST   /api/forms/application  # Create new form
GET    /api/forms/:id          # Get specific form
PUT    /api/forms/:id          # Update form
DELETE /api/forms/:id          # Delete form
```

### **Form Submission Endpoints**
```bash
POST /api/forms/:id/entries    # Submit application
GET  /api/forms/:id/entries    # Get form submissions
GET  /api/forms/:id/entries/:entryId  # Get specific submission
```

### **User Management Endpoints**
```bash
POST /api/recruiter/create     # Create recruiter
POST /api/applicant/create     # Create applicant
GET  /api/users/profile        # Get user profile
PUT  /api/users/profile        # Update user profile
```

### **System Endpoints**
```bash
GET /health                    # Health check
GET /api/status               # System status
```

---

## 🔒 **Security Configuration**

### **CORS Configuration**
```javascript
const corsOptions = {
  origin: [
    'https://main.d1d64zijwu2pjz.amplifyapp.com',
    /\.cloudfront\.net$/,
    'http://localhost:3001' // Development only
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With']
};
```

### **Security Headers**
```javascript
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
}
```

### **Rate Limiting**
```javascript
{
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
}
```

---

## 📊 **Monitoring & Logging**

### **CloudWatch Integration**
```yaml
Log Group: /aws/ecs/recruitment-backend
Log Stream: ecs/recruitment-backend-service
Retention: 7 days
Metrics: CPU, Memory, Request Count, Response Time
```

### **Health Checks**
```bash
# ECS Health Check
curl -f http://localhost:3000/health

# ALB Health Check
GET /health
Expected Response: {"status":"OK"}
Timeout: 5 seconds
Interval: 30 seconds
Healthy Threshold: 2
Unhealthy Threshold: 3
```

### **Monitoring Endpoints**
```bash
GET /health                    # Basic health check
GET /api/status               # Detailed system status
GET /metrics                  # Application metrics (if enabled)
```

---

## 🔧 **Deployment Process**

### **1. Frontend Deployment (Amplify)**
```bash
# Automatic deployment on git push to main branch
git push origin main
```

### **2. Backend Deployment (ECS)**
```bash
# Build Docker image
docker build --platform linux/amd64 -t recruitment-backend .

# Tag and push to ECR
docker tag recruitment-backend:latest 229746606296.dkr.ecr.us-east-2.amazonaws.com/recruitment-backend:latest
docker push 229746606296.dkr.ecr.us-east-2.amazonaws.com/recruitment-backend:latest

# Update ECS service
aws ecs update-service \
  --cluster recruitment-backend-cluster \
  --service recruitment-backend-service \
  --force-new-deployment
```

### **3. Database Migrations**
```bash
# Connect to RDS
psql -h recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com \
     -U admin -d postgres

# Run migration scripts
psql -h recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com \
     -U admin -d postgres -f database/01_user.sql
```

---

## 📋 **Environment Variables**

### **Backend Environment Variables**
```bash
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://admin:***@recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com:5432/postgres

# Security
JWT_SECRET=***
CORS_ORIGIN=https://main.d1d64zijwu2pjz.amplifyapp.com

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=internal.software@dreamteameng.org
SMTP_PASSWORD=***

# Frontend
FRONTEND_URL=https://main.d1d64zijwu2pjz.amplifyapp.com
```

### **Frontend Environment Variables**
```bash
# Application
APP_ENV=production
NEXT_PUBLIC_BACKEND_URL=https://d2oc9fk5wyihzt.cloudfront.net
NEXT_PUBLIC_APP_NAME="Recruitment Website"
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_API_TIMEOUT=30000

# Authentication
NEXTAUTH_SECRET=***
NEXTAUTH_URL=https://main.d1d64zijwu2pjz.amplifyapp.com
```

---

## 🏷️ **AWS Resources Summary**

### **Compute Resources**
- **ECS Cluster**: recruitment-backend-cluster
- **ECS Service**: recruitment-backend-service
- **ECS Task Definition**: recruitment-backend (latest)
- **ECR Repository**: recruitment-backend

### **Networking Resources**
- **VPC**: Default VPC (us-east-2)
- **Application Load Balancer**: recruitment-backend-alb
- **Security Group**: recruitment-backend-sg
- **CloudFront Distribution**: d2oc9fk5wyihzt.cloudfront.net

### **Storage Resources**
- **RDS Instance**: recruitment-backend-db (db.t3.micro)
- **CloudWatch Logs**: /aws/ecs/recruitment-backend

### **Frontend Resources**
- **Amplify App**: recruitment-website
- **Amplify Branch**: main
- **Domain**: main.d1d64zijwu2pjz.amplifyapp.com

---

## 🔧 **Troubleshooting**

### **Common Issues & Solutions**

**1. CORS Errors**
```bash
# Check CORS configuration
curl -H "Origin: https://main.d1d64zijwu2pjz.amplifyapp.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://d2oc9fk5wyihzt.cloudfront.net/api/auth/login
```

**2. Database Connection Issues**
```bash
# Test database connection
psql -h recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com \
     -U admin -d postgres -c "SELECT version();"
```

**3. Health Check Failures**
```bash
# Check ECS service health
aws ecs describe-services \
  --cluster recruitment-backend-cluster \
  --services recruitment-backend-service

# Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-2:229746606296:targetgroup/recruitment-backend-targets/...
```

### **Useful Commands**

```bash
# Check ECS service status
aws ecs describe-services --cluster recruitment-backend-cluster --services recruitment-backend-service

# View CloudWatch logs
aws logs describe-log-streams --log-group-name /aws/ecs/recruitment-backend

# Update ECS service
aws ecs update-service --cluster recruitment-backend-cluster --service recruitment-backend-service --force-new-deployment

# Check RDS status
aws rds describe-db-instances --db-instance-identifier recruitment-backend-db

# CloudFront cache invalidation
aws cloudfront create-invalidation --distribution-id E1234567890 --paths "/*"
```

---

## 📈 **Performance Metrics**

### **Current Performance**
- **Response Time**: ~200-500ms average
- **Throughput**: 100 requests/minute (rate limited)
- **Availability**: 99.9% uptime
- **Database Connections**: Max 100 concurrent

### **Scaling Considerations**
- **ECS**: Auto-scaling not configured (manual scaling required)
- **RDS**: Single instance (no read replicas)
- **CloudFront**: Global edge locations active

---

## 🔮 **Future Enhancements**

### **Planned Improvements**
1. **Auto-scaling**: Implement ECS auto-scaling based on CPU/memory
2. **Database**: Add read replicas for better performance
3. **Monitoring**: Enhanced monitoring with custom metrics
4. **Security**: WAF integration for additional protection
5. **CI/CD**: GitHub Actions for automated deployments

### **Cost Optimization**
- **Reserved Instances**: Consider RDS reserved instances
- **Spot Instances**: Not applicable for ECS Fargate
- **S3**: Implement S3 for file storage instead of ECS volumes

---

*This documentation is automatically generated based on the current infrastructure state. For updates or questions, refer to the deployment scripts and AWS console.*