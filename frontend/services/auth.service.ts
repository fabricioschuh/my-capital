import { apiClient } from './api-client';

export const authService = {
  login: async (username: string, password: string): Promise<void> => {
    const { data } = await apiClient.post<{ accessToken: string }>('/auth/login', {
      username,
      password,
    });
    // Store token in a cookie via the Next.js route handler (sets httpOnly cookie)
    await fetch('/api/auth/set-cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: data.accessToken }),
    });
  },

  logout: async (): Promise<void> => {
    await fetch('/api/auth/set-cookie', { method: 'DELETE' });
  },
};
