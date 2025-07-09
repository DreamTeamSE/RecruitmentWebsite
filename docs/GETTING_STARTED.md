# 🚀 Getting Started - Development Guide

## 🎯 For New Developers

This guide will help you set up the Recruitment Website project for local development.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **PostgreSQL** (v13 or higher) - [Download here](https://www.postgresql.org/download/)
- **Git** - [Download here](https://git-scm.com/)
- **VS Code** (recommended) - [Download here](https://code.visualstudio.com/)

## 🛠️ Quick Setup (5 minutes)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd RecruitmentWebsite
```

### 2. Automated Setup
```bash
# This will create environment files and install dependencies
./scripts/setup-env.sh init
```

### 3. Configure Environment Variables
Edit the created environment files with your actual values:

**Backend** (`backend/.env.local`):
```bash
# Database - Update with your local PostgreSQL credentials
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/recruitment_local

# SMTP - Use your email for testing (optional)
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

**Frontend** (`frontend/.env.local`):
```bash
# Usually these defaults work fine for development
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=http://localhost:3001
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

### 4. Setup Database
```bash
# Create database
createdb recruitment_local

# Create user (optional)
createuser -s your_username
```

### 5. Start Development
```bash
npm run dev
```

Visit:
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 🔧 Manual Setup (If automated setup fails)

### 1. Install Dependencies
```bash
# Root dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Create Environment Files
```bash
# Backend
cp backend/.env.example backend/.env.local

# Frontend
cp frontend/.env.example frontend/.env.local
```

### 3. Edit Environment Files
Update the `.env.local` files with your actual values.

## 🎨 Development Workflow

### Starting the Application
```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:backend    # Backend only (port 3000)
npm run dev:frontend   # Frontend only (port 3001)
```

### Building for Production
```bash
# Build both applications
npm run build

# Or build individually
npm run build:backend
npm run build:frontend
```

### Running Tests
```bash
# Run all tests
npm run test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend
```

## 📁 Project Structure Overview

```
RecruitmentWebsite/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── api/            # API routes
│   │   ├── config/         # Configuration
│   │   ├── model/          # Database models
│   │   └── repositories/   # Data access
│   └── tests/              # Backend tests
├── frontend/               # Next.js React app
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   └── lib/           # Utilities
│   └── public/            # Static assets
└── scripts/               # Deployment scripts
```

## 🔍 Common Development Commands

### Backend Commands
```bash
cd backend
npm run dev          # Start with hot reload
npm run build        # Build TypeScript
npm run validate     # Validate setup
npm run test         # Run tests
```

### Frontend Commands
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run test         # Run tests
```

### Database Commands
```bash
# Connect to database
psql -d recruitment_local

# Drop and recreate database
dropdb recruitment_local
createdb recruitment_local
```

## 🐛 Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Error
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL
brew services start postgresql

# Check connection
psql -d recruitment_local -c "SELECT 1;"
```

#### 2. Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

#### 3. Environment Variables Not Loading
```bash
# Check if .env.local exists
ls -la backend/.env.local
ls -la frontend/.env.local

# Validate environment setup
./scripts/setup-env.sh validate
```

#### 4. TypeScript Compilation Errors
```bash
# Clean build cache
rm -rf backend/dist
rm -rf frontend/.next

# Rebuild
npm run build
```

#### 5. Dependencies Issues
```bash
# Clean node_modules
rm -rf node_modules backend/node_modules frontend/node_modules

# Reinstall
npm install
```

## 🔧 IDE Setup (VS Code)

### Recommended Extensions
- **TypeScript** - Built-in TypeScript support
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Thunder Client** - API testing
- **PostgreSQL** - Database management

### Workspace Settings
Create `.vscode/settings.json`:
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.workingDirectories": ["backend", "frontend"]
}
```

## 📚 Development Resources

### API Documentation
- Backend API: http://localhost:3000/health
- API Routes: Check `backend/src/api/routes/`

### Frontend Development
- Next.js Docs: https://nextjs.org/docs
- Tailwind CSS: https://tailwindcss.com/docs
- Shadcn UI: https://ui.shadcn.com/

### Backend Development
- Express.js: https://expressjs.com/
- TypeScript: https://www.typescriptlang.org/docs/
- PostgreSQL: https://www.postgresql.org/docs/

## 🤝 Contributing

1. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes**
3. **Test your changes**
```bash
npm run test
./deploy.sh deploy-local
```

4. **Commit your changes**
```bash
git add .
git commit -m "feat: add your feature description"
```

5. **Push and create PR**
```bash
git push origin feature/your-feature-name
```

## 📞 Getting Help

- **Documentation**: Check the `docs/` folder
- **Issues**: Create a GitHub issue
- **Questions**: Ask in team chat
- **Code Review**: Request review from team members

---

**Happy coding! 🚀**
