interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  emailVerified: boolean;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

const getBackendUrl = (): string => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendUrl) {
    throw new Error('NEXT_PUBLIC_BACKEND_URL environment variable is not set');
  }
  return backendUrl;
};

const getAllowedDomain = (): string => {
  return process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || '@dreamteameng.org';
};

export const authService = {
  async login(credentials: LoginRequest): Promise<User> {
    const allowedDomain = getAllowedDomain();
    if (!credentials.email.endsWith(allowedDomain)) {
      throw new Error(`Only ${allowedDomain} email addresses are allowed`);
    }

    const response = await fetch(`${getBackendUrl()}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }

    return await response.json();
  },

  async register(userData: RegisterRequest): Promise<{ message: string }> {
    const allowedDomain = getAllowedDomain();
    if (!userData.email.endsWith(allowedDomain)) {
      throw new Error(`Only ${allowedDomain} email addresses are allowed`);
    }

    const response = await fetch(`${getBackendUrl()}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Registration failed');
    }

    return await response.json();
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await fetch(`${getBackendUrl()}/api/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Email verification failed');
    }

    return await response.json();
  },
};