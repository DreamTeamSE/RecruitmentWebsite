# NextAuth.js Authentication Setup - Testing Guide

## Overview
The authentication system is now set up with NextAuth.js using credentials provider for staff login with @dreamteameng.org email domain restriction.

## Test Credentials
For testing purposes, you can use:
- **Email**: `admin@dreamteameng.org`
- **Password**: `password123`

## Available Pages

### Public Pages
- `/` - Home page
- `/auth/signin` - Staff sign-in page
- `/auth/signup` - Staff registration page (for future backend integration)
- `/auth/verify-request` - Email verification pending page
- `/auth/verify-email` - Email verification handler

### Protected Pages (Require Authentication)
- `/dashboard` - Staff dashboard showing user information
- `/applications-review` - Application forms management
- `/applications-review/create` - Create new application form

## Features Implemented

### 1. Domain Restriction
- Only `@dreamteameng.org` email addresses are allowed
- Email validation happens on both frontend and backend

### 2. Session Management
- JWT-based sessions using NextAuth.js
- User information stored in session including role and email verification status

### 3. Route Protection
- `AuthGuard` component wraps protected pages
- Middleware handles authentication redirects
- Navbar shows authentication status and user menu

### 4. User Interface
- Custom sign-in and sign-up forms
- User menu in navbar with authentication status
- Loading states and error handling

## Testing the System

### Step 1: Test Unauthenticated Access
1. Visit `http://localhost:3000/applications-review`
2. Should redirect to sign-in page or show loading/access denied

### Step 2: Test Sign-In
1. Go to `http://localhost:3000/auth/signin`
2. Enter test credentials:
   - Email: `admin@dreamteameng.org`
   - Password: `password123`
3. Should redirect to dashboard or originally requested page

### Step 3: Test Protected Pages
1. After signing in, visit:
   - `/dashboard` - Should show user information
   - `/applications-review` - Should show application forms
   - `/applications-review/create` - Should show form creation page

### Step 4: Test Navigation
1. Check navbar for user menu (should show user avatar and name)
2. Click user menu to see sign-out option
3. Test sign-out functionality

### Step 5: Test Domain Restriction
1. Try signing in with non-@dreamteameng.org email
2. Should show error message about domain restriction

## Next Steps for Production

### 1. Backend Integration (TODO)
Replace the hardcoded credentials in `lib/auth/config.ts` with actual backend API calls:
```typescript
// Replace this test code:
if (credentials.email === "admin@dreamteameng.org" && credentials.password === "password123") {
  // ...
}

// With actual API call:
const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: credentials.email, password: credentials.password })
});
```

### 2. Email Verification
- Complete the email verification system
- Update sign-up page to work with backend
- Implement email verification flow

### 3. Environment Variables
Update `.env.local` with production values:
```bash
NEXTAUTH_SECRET=your-production-secret-key-minimum-32-characters
NEXTAUTH_URL=https://your-production-domain.com
```

### 4. Role-Based Access Control
- Implement different roles (admin, staff, etc.)
- Add role-based page restrictions
- Update user interface based on roles

## Troubleshooting

### Common Issues
1. **NEXTAUTH_URL mismatch**: Ensure the URL in `.env.local` matches your development server
2. **Secret key**: Make sure `NEXTAUTH_SECRET` is set and at least 32 characters long
3. **Port conflicts**: If frontend runs on different port, update `NEXTAUTH_URL`

### Debug Mode
Add to `.env.local` for detailed NextAuth logs:
```bash
NEXTAUTH_DEBUG=true
```

## Security Notes
- The test credentials are for development only
- Change all secrets and passwords for production
- Implement proper password hashing in backend
- Add rate limiting for authentication attempts
- Consider implementing 2FA for production use
