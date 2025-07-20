# Recruitment Website Backend

Simple, production-ready backend for the recruitment website.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### One-Command Deployment

```bash
# Clone and deploy
git clone <repository-url>
cd backend
./deploy.sh
```

That's it! The backend will be running at `http://localhost:3000`

## 📁 Environment Configuration

The `.env` file contains all configuration. For production, update these values:

```bash
# Production settings
NODE_ENV=production
DATABASE_URL=postgresql://username:password@your-db-host:5432/database
JWT_SECRET=your-secure-jwt-secret-32-characters-minimum
CORS_ORIGIN=https://your-frontend-domain.com
FRONTEND_URL=https://your-frontend-domain.com
SMTP_PASSWORD=your-email-app-password
```

## 🛠️ Available Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm test                # Run tests

# Docker deployment
npm run deploy          # Build and deploy everything
npm run docker:up       # Start containers
npm run docker:down     # Stop containers
npm run docker:logs     # View logs

# Quick deployment
./deploy.sh             # One-command deployment
```

## 🔗 API Endpoints

- **Health Check**: `GET /health`
- **Authentication**: `POST /api/auth/login`, `POST /api/auth/register`
- **Forms**: `GET /api/forms/feed`, `POST /api/forms/application`
- **Applications**: `POST /api/forms/:id/entries`

## 🗄️ Database

PostgreSQL database is automatically created with Docker. Schema is initialized on first startup.

## 🔒 Security

- JWT authentication
- CORS protection
- Environment variable configuration
- Input validation

## 📊 Health Monitoring

Check application health: `curl http://localhost:3000/health`

## 🐳 Docker Services

- **app**: Node.js backend application
- **postgres**: PostgreSQL database

## 🚨 Troubleshooting

```bash
# Check logs
npm run docker:logs

# Restart everything
./deploy.sh

# Check container status
docker-compose -f docker-compose.simple.yml ps

# Manual database connection
docker exec -it recruitment-postgres psql -U admin -d postgres
```

## 📝 Production Deployment

1. Update `.env` with production values
2. Set `NODE_ENV=production`
3. Use strong passwords and secrets
4. Configure your domain in CORS settings
5. Run `./deploy.sh`

## 🔧 Development

```bash
# Start development server (no Docker)
npm run dev

# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

---

**Ready to deploy in seconds!** 🚀