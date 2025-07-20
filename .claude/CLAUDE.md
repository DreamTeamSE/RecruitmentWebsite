# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Recruitment Website Development Guide

*Last Updated: July 18, 2025*

---

## 📋 **Project Overview**

### **Application Architecture**
- **Frontend**: Next.js 15 deployed on AWS Amplify (HTTPS)
- **Backend**: Node.js/Express deployed on AWS ECS Fargate (containerized)
- **Database**: AWS RDS PostgreSQL with SSL encryption
- **CDN**: AWS CloudFront for HTTPS termination and global distribution
- **Load Balancer**: AWS Application Load Balancer (ALB)

### **Current Live URLs**
- **Frontend**: https://main.d1d64zijwu2pjz.amplifyapp.com
- **Backend API**: https://d2oc9fk5wyihzt.cloudfront.net
- **Health Check**: https://d2oc9fk5wyihzt.cloudfront.net/health

---

## 🔧 **Development Workflow**

### **Local Development Setup**
```bash
# Clone and install dependencies (npm workspaces)
npm install

# Start both frontend (3001) and backend (3000)
npm run dev

# Or start individually
npm run dev:backend    # Backend only on port 3000
npm run dev:frontend   # Frontend only on port 3001
```

### **Build Commands**
```bash
# Build everything
npm run build

# Build individually
npm run build:backend   # TypeScript compilation with lint checks
npm run build:frontend  # Next.js production build

# Backend specific builds
cd backend
npm run build          # Full build: lint → type-check → compile
npm run type-check     # TypeScript type checking only
npm run clean          # Remove dist folder
```

### **Testing Commands**
```bash
# Run all tests
npm run test

# Backend testing
cd backend
npm run test                # All tests
npm run test:integration    # Integration tests with database
npm run test:watch         # Watch mode for development
npm run test:coverage      # Coverage report

# Single test file
npm test -- tests/integration/complete-flow.test.ts

# Frontend testing (not yet configured)
npm run test:frontend  # Currently returns placeholder message
```

### **Code Quality Commands**
```bash
# Backend linting and formatting
cd backend
npm run lint           # ESLint with TypeScript rules
npm run lint:fix       # Auto-fix linting issues
npm run format         # Prettier formatting
npm run format:check   # Check formatting without fixing
```

---

## 🏗️ **Code Architecture**

### **Backend Architecture (Repository Pattern)**

The backend follows a clean **layered repository pattern**:

```
Controllers → Services → Repositories → Database
```

**Key Architectural Patterns:**
- **Repository Pattern**: Clean separation between data access and business logic
- **Singleton Database Manager**: Connection pooling with proper lifecycle management
- **Middleware Chain**: Error handling, CORS, authentication
- **Transaction Support**: Complex operations (e.g., form deletion with cascading)

**Database Schema Structure:**
```sql
-- Core entity relationships
staff (UUID) → forms (created_by) → questions (ordered) → form_entries → answers
staff (UUID) → staff_application_notes (scoring/feedback)
form_entries → interviews (scheduling)
```

**API Routing Structure:**
- `/api/auth/*` - Authentication (login, register, verify-email)
- `/api/forms/*` - Form CRUD operations
- `/api/forms/:id/entries*` - Form submission handling
- `/api/recruiter/*` - Staff management
- `/api/applicant/*` - Applicant management
- `/api/interview/*` - Interview scheduling

### **Frontend Architecture (Next.js 15 App Router)**

**State Management Strategy:**
- **React Context**: Custom `AuthContext` with reducer pattern for authentication
- **ViewModeContext**: UI state management for application views
- **Session Storage**: Client-side user session persistence
- **API Service Singleton**: Centralized API client with error handling and retry logic

**Component Organization:**
```
components/
├── ui/                 # Shadcn/ui reusable components
├── applications/       # Application-specific components
├── auth/              # Authentication components
├── involved/          # Public-facing components
└── providers/         # Context providers
```

**Next.js App Router Structure:**
```
app/
├── auth/              # Authentication pages (signin, signup, verify)
├── applications-review/ # Staff review interface with dynamic routes
├── get-involved/      # Public application pages
├── dashboard/         # User dashboard
└── api/              # NextAuth routes and health check
```

### **Database Schema Details**

**Entity Relationships:**
- `staff` (1) → (many) `forms` - Staff can create multiple application forms
- `forms` (1) → (many) `questions` - Forms contain ordered questions
- `forms` (1) → (many) `form_entries` - Multiple applicants per form
- `form_entries` (1) → (many) `answers` - Responses to form questions
- `form_entries` (1) → (1) `staff_application_notes` - Staff feedback and scoring
- `form_entries` (1) → (many) `interviews` - Interview scheduling

**Key Design Decisions:**
- **UUID primary keys for staff** (external-facing entities)
- **Serial primary keys for internal entities** (applicants, form_entries)
- **Unique constraints** on applicant-form combinations
- **Ordered questions** within forms via `question_order` field
- **Email verification system** with token expiration
- **Backward compatibility view** mapping old `recruiters` table to `staff`

---

## 🧪 **Testing Strategy**

### **Backend Testing Architecture**
- **Jest + Supertest**: Integration testing framework with real database
- **Test Coverage**: Configured for 80%+ coverage requirement
- **Test Data Management**: Helper functions for unique test data generation
- **End-to-End Workflows**: Complete application flow testing

**Test Organization:**
```
tests/
├── integration/       # Full workflow tests
├── helpers/          # Test utilities and setup
└── setup.ts          # Global test configuration
```

**Key Test Patterns:**
```typescript
// Complete workflow testing example
describe('Complete Application Flow', () => {
  // Staff creation → Form creation → Questions → Submissions → Reviews
});

// Test data helpers
generateUniqueStaffData(role: string): StaffData
generateUniqueApplicantData(): ApplicantData
```

### **Integration Test Examples**
```bash
# Run specific integration test
npm test -- tests/integration/complete-flow.test.ts

# Run application flow tests
npm test -- tests/integration/application-flow.test.ts

# Run form management tests
npm test -- tests/integration/form-management.test.ts
```

---

## 🐳 **Docker & Deployment**

### **Docker Multi-Stage Builds**

**Backend Dockerfile Features:**
- **Multi-stage build** with distroless base image for security
- **Non-root user execution** with proper permissions
- **Health check integration** with /health endpoint
- **Signal handling** with dumb-init for graceful shutdowns

**Docker Commands:**
```bash
# Build backend for production
cd backend
docker build --platform linux/amd64 -t recruitment-backend .

# Test local build
docker run -p 3000:3000 recruitment-backend
```

### **AWS Deployment Process**

**Backend Deployment (ECS):**
```bash
# Build and push to ECR
docker build --platform linux/amd64 -t recruitment-backend .
docker tag recruitment-backend:latest 229746606296.dkr.ecr.us-east-2.amazonaws.com/recruitment-backend:latest
docker push 229746606296.dkr.ecr.us-east-2.amazonaws.com/recruitment-backend:latest

# Update ECS service
aws ecs update-service \
  --cluster recruitment-backend-cluster \
  --service recruitment-backend-service \
  --force-new-deployment
```

**Frontend Deployment (Amplify):**
```bash
# Automatic deployment on git push to main branch
git push origin main
```

---

## 📊 **Database Management**

### **Database Connection Configuration**
```typescript
// Singleton pattern with connection pooling
class DatabaseManager {
  - Connection pooling (max 20 connections)
  - Health check integration
  - Graceful shutdown handling
  - Transaction support for complex operations
}
```

### **Schema Migrations**
```bash
# Connect to production database
psql -h recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com \
     -U admin -d postgres

# Run migration scripts in order
psql -h recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com \
     -U admin -d postgres -f backend/postgres-init/01_user.sql
psql -h recruitment-backend-db.cd0eoiq8iq3g.us-east-2.rds.amazonaws.com \
     -U admin -d postgres -f backend/postgres-init/02_applications.sql
```

### **Test Database Setup**
```bash
# Create local test database
createdb recruitment_test

# The tests use the same schema as production
# No separate test migrations needed - tests create/drop tables as needed
```

---

## 🔧 **Infrastructure Components**

### **Frontend Infrastructure (AWS Amplify)**

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

### **Backend Infrastructure (AWS ECS Fargate)**

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

### **Database Infrastructure (AWS RDS)**

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

### **Container Registry (AWS ECR)**

```yaml
Repository: recruitment-backend
URI: 229746606296.dkr.ecr.us-east-2.amazonaws.com/recruitment-backend
Image Tag: latest
Architecture: linux/amd64
Scan on Push: Enabled
```

### **Load Balancer (AWS ALB)**

```yaml
Name: recruitment-backend-alb
DNS: recruitment-backend-alb-604348918.us-east-2.elb.amazonaws.com
Scheme: Internet-facing
Type: Application Load Balancer
Port: 80 (HTTP)
Target Group: recruitment-backend-targets
Health Check: /health
```

### **Content Delivery Network (AWS CloudFront)**

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
DELETE /api/forms/:id          # Delete form (cascades to questions/entries)
```

### **Form Submission Endpoints**
```bash
POST /api/forms/:id/entries    # Submit application
GET  /api/forms/:id/entries    # Get form submissions
GET  /api/forms/:id/entries/:entryId  # Get specific submission
```

### **User Management Endpoints**
```bash
POST /api/recruiter/create     # Create recruiter/staff
POST /api/applicant/create     # Create applicant
GET  /api/users/profile        # Get user profile
PUT  /api/users/profile        # Update user profile
```

### **System Endpoints**
```bash
GET /health                    # Health check with database connectivity
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

### **Application Logging**
- **Structured logging** with `logger.service.ts`
- **API request/response logging** for debugging
- **Error tracking** with context and stack traces
- **Performance monitoring** for database queries

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
Expected Response: {"status":"OK","database":"connected","timestamp":"..."}
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

**3. Build Failures**
```bash
# Check TypeScript compilation
cd backend
npm run type-check

# Check linting issues
npm run lint

# Clean build
npm run clean && npm run build
```

**4. Test Failures**
```bash
# Run tests with verbose output
npm run test -- --verbose

# Run specific test file
npm test -- tests/integration/complete-flow.test.ts

# Check test database connection
# Tests create their own temporary data
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
- **Database Connections**: Max 20 concurrent (connection pooling)

### **Scaling Considerations**
- **ECS**: Auto-scaling not configured (manual scaling required)
- **RDS**: Single instance (no read replicas)
- **CloudFront**: Global edge locations active

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

## 🔮 **Future Enhancements**

### **Planned Improvements**
1. **Auto-scaling**: Implement ECS auto-scaling based on CPU/memory
2. **Database**: Add read replicas for better performance
3. **Monitoring**: Enhanced monitoring with custom metrics
4. **Security**: WAF integration for additional protection
5. **CI/CD**: GitHub Actions for automated deployments
6. **Frontend Testing**: Jest + Testing Library + Cypress setup
7. **Caching**: Redis for session storage and API response caching

### **Cost Optimization**
- **Reserved Instances**: Consider RDS reserved instances
- **Spot Instances**: Not applicable for ECS Fargate
- **S3**: Implement S3 for file storage instead of ECS volumes

---

*This documentation is automatically generated based on the current infrastructure state. For updates or questions, refer to the deployment scripts and AWS console.*