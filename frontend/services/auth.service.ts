import { apiClient } from './api-client';

export const authService = {
  login: async (username: string, password: string): Promise<void> => {
    await apiClient.post('/auth/login', { username, password });
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
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
