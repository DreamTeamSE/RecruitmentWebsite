# Recruitment Website Deployment System

A comprehensive deployment system for the Recruitment Website backend with support for local development and AWS production deployment.

## 🚀 Quick Start

### Check Current Status
```bash
./deployment-summary.sh
```

### Deploy to Production
```bash
./deploy.sh deploy-aws
```

### Deploy Locally
```bash
./deploy.sh deploy-local
```

## 📋 File Overview

| File | Description |
|------|-------------|
| `deploy-backend.sh` | Main deployment script with full functionality |
| `deploy.sh` | Simple wrapper script that loads configuration |
| `deployment-summary.sh` | Shows current deployment status |
| `deployment-config.env` | Configuration file for deployment settings |
| `DEPLOYMENT_SCRIPTS.md` | Comprehensive documentation |

## 🎯 Current Production Status

✅ **Backend API**: https://d2oc9fk5wyihzt.cloudfront.net  
✅ **Frontend**: https://main.d1d64zijwu2pjz.amplifyapp.com  
✅ **Health Check**: https://d2oc9fk5wyihzt.cloudfront.net/health  

## 🛠 Available Commands

| Command | Description |
|---------|-------------|
| `./deploy.sh deploy-aws` | Deploy to AWS ECS |
| `./deploy.sh deploy-local` | Deploy to local Docker |
| `./deploy.sh status aws` | Check AWS deployment status |
| `./deploy.sh health <url>` | Check deployment health |
| `./deploy.sh build` | Build application and Docker image |
| `./deploy.sh cleanup` | Clean up Docker resources |
| `./deployment-summary.sh` | Show complete deployment status |

## 🔧 Configuration

### Environment Variables
Edit `./backend/.env.production`:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://admin:password@your-db:5432/recruitment_db
JWT_SECRET=your-secret-key
CORS_ORIGIN=https://your-frontend.com
```

### Deployment Settings
Edit `deployment-config.env`:
```env
AWS_REGION=us-east-2
ECR_REPOSITORY_NAME=recruitment-backend
ECS_CLUSTER_NAME=recruitment-backend-cluster
ECS_SERVICE_NAME=recruitment-backend-service
```

## 📊 Monitoring

### Check Status
```bash
./deploy.sh status aws
```

### View Logs
```bash
./deploy.sh logs local
```

### Health Checks
```bash
./deploy.sh health https://d2oc9fk5wyihzt.cloudfront.net
```

## 🔍 Troubleshooting

### Common Issues

1. **Docker Build Fails**
   ```bash
   docker system prune -a
   ./deploy.sh build
   ```

2. **AWS Deployment Fails**
   ```bash
   aws sts get-caller-identity
   ./deploy.sh deploy-aws
   ```

3. **Health Check Fails**
   ```bash
   ./deploy.sh logs aws
   curl -v https://d2oc9fk5wyihzt.cloudfront.net/health
   ```

## 📚 Documentation

- [`DEPLOYMENT_SCRIPTS.md`](DEPLOYMENT_SCRIPTS.md) - Complete deployment guide
- [`COMPREHENSIVE_DEPLOYMENT_GUIDE.md`](COMPREHENSIVE_DEPLOYMENT_GUIDE.md) - Full infrastructure guide
- [`DEPLOYMENT_SUCCESS.md`](DEPLOYMENT_SUCCESS.md) - Current deployment status

## 🔐 Security

- HTTPS enabled for all production endpoints
- CORS properly configured
- Environment variables secured
- JWT authentication implemented

## 🎯 Next Steps

1. **Monitor deployment**: Use `./deployment-summary.sh` regularly
2. **Update application**: Use `./deploy.sh deploy-aws` for updates
3. **Check health**: Use `./deploy.sh health <url>` for monitoring
4. **Clean up**: Use `./deploy.sh cleanup` for maintenance

---

**✅ The deployment system is production-ready and fully operational!**