# 🚀 Recruitment Website

A modern, full-stack recruitment website built with Next.js (frontend) and Node.js/Express (backend), deployed on AWS.

## 📋 Table of Contents

- [🏗️ Architecture Overview](#architecture-overview)
- [⚡ Quick Start](#quick-start)
- [🛠️ Development Setup](#development-setup)
- [🚀 Deployment](#deployment)
- [📁 Project Structure](#project-structure)
- [🔧 Configuration](#configuration)
- [🧪 Testing](#testing)
- [📚 Documentation](#documentation)
- [🤝 Contributing](#contributing)

## 🏗️ Architecture Overview

### Frontend (Next.js)
- **Framework**: Next.js 14 with TypeScript
- **UI**: Tailwind CSS with Shadcn UI components
- **Authentication**: NextAuth.js
- **Deployment**: AWS Amplify
- **URL**: `https://main.d1d64zijwu2pjz.amplifyapp.com`

### Backend (Node.js)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL (AWS RDS)
- **Authentication**: JWT-based
- **Deployment**: AWS ECS Fargate
- **URL**: `https://d2oc9fk5wyihzt.cloudfront.net`

### Infrastructure
- **Database**: AWS RDS PostgreSQL
- **Container Registry**: AWS ECR
- **Load Balancer**: AWS CloudFront
- **Monitoring**: AWS CloudWatch

## ⚡ Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 13+
- Docker (for deployment)
- AWS CLI (for cloud deployment)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd RecruitmentWebsite
./scripts/setup-env.sh init
```

### 2. Configure Environment
Edit the environment files with your actual values:
```bash
# Backend configuration
vim backend/.env.local

# Frontend configuration  
vim frontend/.env.local
```

### 3. Start Development
```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:backend    # Backend only
npm run dev:frontend   # Frontend only
```

### 4. Access the Application
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 🛠️ Development Setup

### Backend Setup
```bash
cd backend
npm install
npm run dev        # Start with hot reload
npm run build      # Build for production
npm run validate   # Validate setup
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev        # Start development server
npm run build      # Build for production
npm run lint       # Run linting
```

### Database Setup
```bash
# Create local database
createdb recruitment_local

# Run migrations (if available)
npm run db:migrate

# Seed data (if available)
npm run db:seed
```

## 🚀 Deployment

### Local Development
```bash
./deploy.sh deploy-local
```

### AWS Production
```bash
./deploy.sh deploy-aws
```

### Build Only
```bash
./deploy.sh build
```

### Check Status
```bash
./deploy.sh status
```

### Cleanup
```bash
./deploy.sh cleanup
```

## 📁 Project Structure

```
RecruitmentWebsite/
├── backend/                    # Node.js backend
│   ├── src/
│   │   ├── api/               # API routes and controllers
│   │   ├── config/            # Configuration files
│   │   ├── model/             # Database models
│   │   ├── repositories/      # Data access layer
│   │   └── types/             # TypeScript types
│   ├── tests/                 # Backend tests
│   ├── .env.template          # Environment template
│   ├── Dockerfile             # Docker configuration
│   └── package.json
├── frontend/                   # Next.js frontend
│   ├── src/
│   │   ├── app/               # Next.js app router
│   │   ├── components/        # React components
│   │   ├── lib/               # Utility libraries
│   │   └── types/             # TypeScript types
│   ├── public/                # Static assets
│   ├── .env.template          # Environment template
│   └── package.json
├── scripts/                    # Deployment and utility scripts
│   ├── deployment/            # Deployment scripts
│   ├── testing/               # Test scripts
│   └── setup-env.sh           # Environment setup
├── config/                     # Configuration files
├── docs/                       # Documentation
├── deploy.sh                   # Main deployment script
└── README.md
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env.local)
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/db
JWT_SECRET=your-jwt-secret
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-app-password
FRONTEND_URL=http://localhost:3001
```

#### Frontend (.env.local)
```bash
APP_ENV=development
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3001
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

### Security Best Practices
- ✅ Environment files are git-ignored
- ✅ Use strong, unique secrets for production
- ✅ Enable HTTPS in production
- ✅ Configure CORS properly
- ✅ Use environment-specific configurations

## 🧪 Testing

### Run All Tests
```bash
npm run test
```

### Backend Tests
```bash
npm run test:backend
```

### Frontend Tests
```bash
npm run test:frontend
```

### Integration Tests
```bash
./scripts/testing/final-integration-test.js
```

## 📚 Documentation

- [📋 Comprehensive Deployment Guide](docs/COMPREHENSIVE_DEPLOYMENT_GUIDE.md)
- [🔧 Environment Configuration](docs/ENVIRONMENT_CONFIGURATION_GUIDE.md)
- [🚀 Deployment Scripts](docs/DEPLOYMENT_SCRIPTS.md)
- [✅ Production Checklist](docs/PRODUCTION_CHECKLIST.md)
- [📧 SMTP Configuration](docs/SMTP_CONFIGURATION.md)
- [🔐 Authentication Guide](docs/AUTHENTICATION_GUIDE.md)

## 🤝 Contributing

### Development Workflow
1. Create feature branch from `main`
2. Make changes following code style guidelines
3. Run tests: `npm run test`
4. Test deployment: `./deploy.sh deploy-local`
5. Create pull request

### Code Style
- TypeScript strict mode enabled
- ESLint configuration enforced
- Prettier formatting applied
- Conventional commit messages

### Pull Request Process
1. Ensure all tests pass
2. Update documentation if needed
3. Request review from maintainers
4. Merge after approval

## 📞 Support

For issues and questions:
- 📧 Email: support@dreamteameng.org
- 📋 Issues: Create GitHub issue
- 📖 Docs: Check documentation in `docs/`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by Dream Team Engineering**
