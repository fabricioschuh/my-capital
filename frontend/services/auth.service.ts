import { apiClient } from './api-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'https://my-capital.onrender.com/api';

export const authService = {
  login: async (username: string, password: string): Promise<void> => {
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? 'Invalid credentials');
    }
    const { accessToken } = await res.json();
    await fetch('/api/auth/set-cookie', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: accessToken }),
    });
  },

  logout: async (): Promise<void> => {
    await fetch('/api/auth/set-cookie', { method: 'DELETE' });
  },

  isAuthenticated: async (): Promise<boolean> => {
    try {
      await apiClient.get('/auth/me');
      return true;
    } catch {
      return false;
    }
  },
};

