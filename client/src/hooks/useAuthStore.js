import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      // Initialize auth state
      init: async (meFn) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = await meFn();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      // Login
      login: async (email, password, loginFn) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = await loginFn(email, password);
          set({ user, isAuthenticated: true, isLoading: false, error: null });
          return { success: true };
        } catch (err) {
          set({ error: err.message, isLoading: false });
          return { success: false, error: err.message };
        }
      },

      // Logout
      logout: async (logoutFn) => {
        try {
          await logoutFn();
        } catch {
          // Ignore logout API errors
        }
        set({ user: null, isAuthenticated: false, error: null });
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Update user
      setUser: (user) => set({ user }),

      // Set authenticated state
      setIsAuthenticated: (value) => set({ isAuthenticated: value, isLoading: false }),
    }),
    {
      name: 'stockroom-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);