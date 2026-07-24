import { apiClient } from './api-client';

const TOKEN_KEY = 'auth_token';

export const authService = {
  login: async (username: string, password: string): Promise<void> => {
    const { data } = await apiClient.post<{ accessToken: string }>('/auth/login', {
      username,
      password,
    });
    localStorage.setItem(TOKEN_KEY, data.accessToken);
  },

  logout: (): void => {
    localStorage.removeItem(TOKEN_KEY);
  },

  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },
};
