# Backend Integration Test Suite

This directory contains comprehensive integration tests for the RecruitmentWebsite backend API.

## Test Structure

### Integration Tests (`/integration/`)

1. **AWS Deployment Tests** (`aws-deployment.test.ts`)
   - Docker build validation
   - AWS deploy script validation 
   - Environment configuration testing
   - Security and performance validation

2. **Form Management Tests** (`form-management.test.ts`)
   - Complete form CRUD operations
   - Question management and ordering
   - Form submissions and entries
   - Data validation and constraints

3. **Staff Management Tests** (`staff-management.test.ts`)
   - Staff/recruiter creation and management
   - Role-based access and permissions
   - @dreamteameng.org domain validation
   - Password security and validation

4. **Email Verification Tests** (`email-verification.test.ts`)
   - Email domain validation (@dreamteameng.org)
   - Registration and verification flow
   - Token management and expiration
   - Security validation and edge cases

5. **Application Flow Tests** (`application-flow.test.ts`)
   - End-to-end application workflow
   - Data integrity and constraints
   - Interview management integration
   - Performance under load

## Running Tests

### Prerequisites

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Test Database**
   - Create a test database: `recruitment_test`
   - Update `.env.test` with your test database credentials
   - Run database migrations/schema setup

3. **Configure Environment**
   - Copy `.env.test.example` to `.env.test`
   - Update test database and email configuration

### Test Commands

```bash
# Run all tests
npm test

# Run integration tests only
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npx jest tests/integration/form-management.test.ts

# Run tests with verbose output
npx jest --verbose
```

### AWS Deployment Tests

To run AWS deployment tests:

1. **Configure AWS CLI**
   ```bash
   aws configure
   ```

2. **Install Docker** (for container tests)

3. **Run AWS-specific tests**
   ```bash
   npx jest tests/integration/aws-deployment.test.ts
   ```

## Test Data Management

### Test Helpers (`/helpers/`)

- **testApp.ts**: Creates test application instance
- **generateUniqueStaffData()**: Generates unique staff test data
- **generateUniqueApplicantData()**: Generates unique applicant test data

### Data Cleanup

Tests are designed to:
- Use unique identifiers to avoid conflicts
- Clean up created test data in `afterAll` hooks
- Handle test isolation to prevent data contamination

## Key Features Tested

### Authentication & Security
- ✅ @dreamteameng.org domain validation
- ✅ Password strength requirements
- ✅ Email verification workflow
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ Input validation and sanitization

### Core Business Logic
- ✅ Form creation and management
- ✅ Question ordering and validation
- ✅ Application submission process
- ✅ Interview scheduling and management
- ✅ Staff review and scoring
- ✅ Data integrity constraints

### System Integration
- ✅ Database relationships and constraints
- ✅ Email service integration
- ✅ Error handling and edge cases
- ✅ Performance under concurrent load
- ✅ AWS deployment readiness

### Data Validation
- ✅ Unique constraints enforcement
- ✅ Foreign key relationships
- ✅ Email format validation
- ✅ Score range validation
- ✅ Required field validation

## Configuration

### Environment Variables (.env.test)

```env
NODE_ENV=test
DATABASE_URL=postgresql://user:pass@localhost:5432/recruitment_test
SMTP_HOST=localhost
FRONTEND_URL=http://localhost:3001
JWT_SECRET=test_secret
```

### Jest Configuration (jest.config.js)

- TypeScript support with ts-jest
- 30-second test timeout for integration tests
- Coverage collection from src/ directory
- Sequential test execution with --runInBand

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify test database exists and is accessible
   - Check DATABASE_URL in .env.test
   - Ensure database schema is up to date

2. **AWS Tests Failing**
   - Configure AWS CLI with valid credentials
   - Install and start Docker
   - Check AWS permissions for ECR, ECS, RDS

3. **Email Tests Failing**
   - Configure SMTP settings in .env.test
   - Check email service availability
   - Verify domain validation logic

4. **Port Conflicts**
   - Ensure test port (3001) is available
   - Stop other development servers during testing

### Debugging Tips

1. **Verbose Output**
   ```bash
   npx jest --verbose --no-coverage
   ```

2. **Run Single Test**
   ```bash
   npx jest --testNamePattern="should create a new form"
   ```

3. **Debug Mode**
   ```bash
   node --inspect-brk node_modules/.bin/jest --runInBand
   ```

## Contributing

When adding new tests:

1. Follow existing test structure and naming conventions
2. Use descriptive test names that explain the expected behavior
3. Include both positive and negative test cases
4. Add proper cleanup in `afterAll` hooks
5. Update this README with new test categories

## Test Coverage Goals

- **API Endpoints**: 100% coverage of all routes
- **Business Logic**: All critical workflows tested
- **Error Handling**: All error conditions covered
- **Security**: All validation and sanitization tested
- **Performance**: Load testing for critical paths