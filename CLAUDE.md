# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Root Level Commands
- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:backend` - Start only backend (port 3000)
- `npm run dev:frontend` - Start only frontend (port 3001)
- `npm run build` - Build both frontend and backend
- `npm run test` - Run all tests for frontend and backend
- `npm run deploy` - Deploy locally using deployment scripts

### Backend Commands (run from `/backend`)
- `npm run dev` - Start backend with hot reload using nodemon
- `npm run build` - Compile TypeScript to `/dist`
- `npm run start` - Start production server from compiled code
- `npm run test` - Run Jest tests
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking without build
- `npm run clean` - Remove dist directory

### Frontend Commands (run from `/frontend`)
- `npm run dev` - Start Next.js development server (port 3001)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run Next.js ESLint configuration
- `npm run release` - Lint and build for release

### Database Setup
Backend uses PostgreSQL via Docker. Start database with:
```bash
cd backend && docker-compose up -d postgres
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Express.js with TypeScript, PostgreSQL
- **Authentication**: NextAuth.js (frontend) + JWT (backend)
- **Deployment**: AWS Amplify (frontend), AWS ECS (backend)

### Key Directories
- `backend/src/api/` - API controllers and routes
- `backend/src/model/` - Database models (applications, interviews, users)
- `backend/src/repositories/` - Data access layer
- `frontend/src/app/` - Next.js app router pages
- `frontend/src/components/` - React components organized by feature
- `frontend/src/lib/` - Utilities, hooks, and services

### Database Architecture
- **Applications**: Form-based application system with dynamic questions
- **Interviews**: Interview scheduling and notes
- **Users**: Applicants, Recruiters, and Staff with role-based access

### API Structure
Backend follows RESTful patterns with routes organized by domain:
- `/api/forms/` - Application form management
- `/api/users/` - User management (applicants, recruiters)
- `/api/interviews/` - Interview scheduling
- `/api/auth/` - Authentication endpoints

### Frontend Architecture
- App Router with TypeScript
- Component organization by feature (auth, applications, home, etc.)
- Centralized API service layer in `lib/services/`
- Context providers for state management
- Custom hooks for form handling and API calls

## Development Patterns

### Code Style
- TypeScript strict mode enabled
- ESLint with strict rules for both frontend and backend
- Prefer explicit return types for functions
- No unused variables (except prefixed with `_`)
- Console usage restricted (use `logger` service)

### Component Patterns
- Shadcn UI components in `components/ui/`
- Feature-based component organization
- Custom hooks for stateful logic
- Error boundaries for robust error handling

### API Patterns
- Repository pattern for data access
- Controller-service separation
- Centralized error handling middleware
- Type-safe request/response models

### Testing
- Jest for backend unit tests
- Integration tests in `backend/tests/integration/`
- Test setup in `backend/tests/setup.ts`
- Environment-specific test configuration

## Environment Setup

### Required Environment Variables

**Backend (.env.local)**
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/db
JWT_SECRET=your-jwt-secret
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-app-password
FRONTEND_URL=http://localhost:3001
```

**Frontend (.env.local)**
```
APP_ENV=development
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3001
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

### CORS Configuration
Backend is configured to accept requests from:
- `localhost:3001` (local frontend)
- `*.amplifyapp.com` (deployed frontend)
- `*.cloudfront.net` (AWS CloudFront)

## Deployment

### Local Development
Use provided scripts:
- `./deploy-backend.sh` - Start database and backend
- `./deploy-frontend.sh` - Build and start frontend
- Root `npm run dev` for concurrent development

### Production
- Frontend: AWS Amplify automatic deployment
- Backend: AWS ECS with CloudFront distribution
- Database: AWS RDS PostgreSQL

## Testing Strategy

### Backend Tests
- Unit tests for repositories and services
- Integration tests for API endpoints
- Complete flow tests in `tests/integration/complete-flow.test.ts`
- Staff permission tests in `tests/integration/staff.test.ts`

### Running Tests
Always run tests before committing:
```bash
npm run test  # Run all tests
npm run test:backend  # Backend only
```

## Common Workflows

### Adding New API Endpoints
1. Define model in `backend/src/model/`
2. Create repository in `backend/src/repositories/`
3. Implement controller in `backend/src/api/controllers/`
4. Add routes in `backend/src/api/routes/`
5. Update main router in `routes.ts`

### Adding New Frontend Pages
1. Create page in `frontend/src/app/`
2. Add components in `frontend/src/components/`
3. Create API service functions in `frontend/src/lib/services/`
4. Add types in `frontend/src/models/types/`

### Database Changes
1. Update models in `backend/src/model/`
2. Create migration script in `backend/postgres-init/`
3. Update repositories to handle new schema
4. Test with fresh database setup