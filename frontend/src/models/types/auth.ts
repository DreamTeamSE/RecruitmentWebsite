// ============================================================================
// Authentication Types
// ============================================================================

/**
 * Extended user type with custom properties
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'recruiter' | 'user';
  emailVerified: boolean;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Registration request payload
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  confirmPassword: string;
}

/**
 * Password reset request payload
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirmation payload
 */
export interface PasswordResetConfirmRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

/**
 * Email verification request payload
 */
export interface EmailVerificationRequest {
  token: string;
}

/**
 * Authentication response from API
 */
export interface AuthResponse {
  user: AuthenticatedUser;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
}

/**
 * Session state
 */
export interface SessionState {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

/**
 * Auth context value
 */
export interface AuthContextValue {
  session: SessionState;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

/**
 * Role-based access control
 */
export interface RolePermissions {
  canCreateForms: boolean;
  canViewAllApplications: boolean;
  canReviewApplications: boolean;
  canManageUsers: boolean;
  canAccessAdminPanel: boolean;
}

/**
 * Type guard to check if user is authenticated
 */
export function isAuthenticatedUser(user: unknown): user is AuthenticatedUser {
  return (
    typeof user === 'object' &&
    user !== null &&
    typeof (user as AuthenticatedUser).id === 'string' &&
    typeof (user as AuthenticatedUser).email === 'string' &&
    typeof (user as AuthenticatedUser).emailVerified === 'boolean'
  );
}

/**
 * Get role permissions for a user
 */
export function getRolePermissions(role: AuthenticatedUser['role']): RolePermissions {
  switch (role) {
    case 'admin':
      return {
        canCreateForms: true,
        canViewAllApplications: true,
        canReviewApplications: true,
        canManageUsers: true,
        canAccessAdminPanel: true,
      };
    case 'recruiter':
      return {
        canCreateForms: true,
        canViewAllApplications: true,
        canReviewApplications: true,
        canManageUsers: false,
        canAccessAdminPanel: false,
      };
    case 'user':
    default:
      return {
        canCreateForms: false,
        canViewAllApplications: false,
        canReviewApplications: false,
        canManageUsers: false,
        canAccessAdminPanel: false,
      };
  }
}