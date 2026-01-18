import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, User } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, nombre: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          const { user, token } = response.data.data!;
          
          localStorage.setItem('token', token);
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (error: any) {
          const message = error.response?.data?.message || 'Error al iniciar sesión';
          set({ error: message, isLoading: false });
          return false;
        }
      },

      register: async (email: string, password: string, nombre: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(email, password, nombre);
          const { user, token } = response.data.data!;
          
          localStorage.setItem('token', token);
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (error: any) {
          const message = error.response?.data?.message || 'Error al registrarse';
          set({ error: message, isLoading: false });
          return false;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          set({ isAuthenticated: false, user: null, token: null });
          return false;
        }

        set({ isLoading: true });
        try {
          const response = await authApi.me();
          set({
            user: response.data.data!,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch {
          localStorage.removeItem('token');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return false;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
