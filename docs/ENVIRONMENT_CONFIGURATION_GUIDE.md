# Environment Configuration Guide

## 🚨 **Authentication Configuration Error Fix**

You're getting the error `https://main.d1d64zijwu2pjz.amplifyapp.com/api/auth/error?error=Configuration` because of environment variable mismatches between development and production.

## 🔧 **Issue Analysis**

1. **Production URL mismatch**: Frontend deployed to HTTPS but some configs point to localhost
2. **Missing environment variables**: Amplify deployment missing required NextAuth environment variables
3. **Backend response format**: Authentication response structure needs to match frontend expectations

## ✅ **Solution Steps**

### **Step 1: Fix AWS Amplify Environment Variables**

In your AWS Amplify console, set these environment variables:

```env
# Required for NextAuth
NEXTAUTH_SECRET=j9Aupfj+wvAvPqhE3hB5e//Ix1PYwt7JQiZwXSUDrww=
NEXTAUTH_URL=https://main.d1d64zijwu2pjz.amplifyapp.com

# Backend Configuration
NEXT_PUBLIC_BACKEND_URL=https://d2oc9fk5wyihzt.cloudfront.net

# Application Environment
APP_ENV=production
```

### **Step 2: Environment File Configuration**

Your environment files should be configured as follows:

#### **`.env.local` (Local Development)**
```env
APP_ENV=development
NEXTAUTH_SECRET=j9Aupfj+wvAvPqhE3hB5e//Ix1PYwt7JQiZwXSUDrww=
NEXTAUTH_URL=http://localhost:3001
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

#### **`.env.production` (Production)**
```env
APP_ENV=production
NEXTAUTH_SECRET=j9Aupfj+wvAvPqhE3hB5e//Ix1PYwt7JQiZwXSUDrww=
NEXTAUTH_URL=https://main.d1d64zijwu2pjz.amplifyapp.com
NEXT_PUBLIC_BACKEND_URL=https://d2oc9fk5wyihzt.cloudfront.net
```

### **Step 3: Update NextAuth Configuration**

The authentication config has been updated to handle the correct backend response format:

```typescript
// Backend returns user data directly, not wrapped in "staff" object
return {
  id: data.id,
  email: data.email,
  name: `${data.first_name} ${data.last_name}`,
  role: data.role || "staff",
  emailVerified: data.emailVerified,
}
```

### **Step 4: Backend URL Configuration**

Updated the constants to properly handle production vs development:

```typescript
export const getBackendUrl = (): string => {
  if (process.env.APP_ENV === 'development') {
    return 'http://localhost:3000';
  } else {
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'https://d2oc9fk5wyihzt.cloudfront.net';
  }
};
```

## 🔧 **AWS Amplify Configuration Steps**

1. **Go to AWS Amplify Console**
2. **Select your app**: `main` branch
3. **Go to Environment Variables**
4. **Add these variables**:
   ```
   NEXTAUTH_SECRET=j9Aupfj+wvAvPqhE3hB5e//Ix1PYwt7JQiZwXSUDrww=
   NEXTAUTH_URL=https://main.d1d64zijwu2pjz.amplifyapp.com
   NEXT_PUBLIC_BACKEND_URL=https://d2oc9fk5wyihzt.cloudfront.net
   APP_ENV=production
   ```
5. **Save and redeploy**

## 🧪 **Testing the Fix**

### **Test 1: Check Environment Variables**
After deployment, visit: `https://main.d1d64zijwu2pjz.amplifyapp.com/api/auth/providers`

This should return a JSON response with available providers, not an error.

### **Test 2: Test Authentication Flow**
1. Create a verified user account
2. Try to sign in
3. Should not get the Configuration error

### **Test 3: Backend Connection**
The frontend should connect to: `https://d2oc9fk5wyihzt.cloudfront.net/api/auth/login`

## 🎯 **Root Cause Summary**

The configuration error occurs because:

1. **Missing Environment Variables**: Amplify deployment doesn't have `NEXTAUTH_SECRET` and `NEXTAUTH_URL`
2. **URL Mismatch**: Frontend tries to use localhost URLs in production
3. **Backend Response Format**: Frontend expected `data.staff.email` but backend returns `data.email`

## 📝 **Files Updated**

1. **`frontend/.env.local`** - Set to production mode
2. **`frontend/.env.development`** - Created for development
3. **`frontend/.env.production`** - Created for production
4. **`frontend/src/lib/auth/config.ts`** - Fixed backend response handling
5. **`frontend/src/lib/constants/string.ts`** - Fixed URL resolution

## 🚀 **Next Steps**

1. **Configure Amplify environment variables** (most important)
2. **Redeploy the application**
3. **Create a verified user account** for testing
4. **Test the authentication flow**

## 🔍 **Debugging Commands**

```bash
# Test NextAuth providers endpoint
curl https://main.d1d64zijwu2pjz.amplifyapp.com/api/auth/providers

# Test backend login endpoint
curl -X POST https://d2oc9fk5wyihzt.cloudfront.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@dreamteameng.org","password":"password"}'

# Check frontend build
npm run build

# Test local development
npm run dev
```

## ⚠️ **Important Notes**

1. **Environment Variables**: Must be set in AWS Amplify console, not just in files
2. **URL Consistency**: All URLs must match the deployment environment
3. **User Verification**: Users must be email-verified to log in
4. **Domain Restriction**: Only `@dreamteameng.org` emails are allowed

After following these steps, the authentication configuration error should be resolved!