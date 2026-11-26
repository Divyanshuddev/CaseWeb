import { create } from "zustand";
import { authApi } from "@/services/api";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: false,
  initialized: false,

  setAuth: (token, user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("caseweb_token", token);
    }
    set({ token, user, initialized: true });
  },

  setUser: (user) => set({ user }),

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("caseweb_token");
    }
    set({ user: null, token: null, initialized: true });
  },

  hydrate: async () => {
    if (typeof window === "undefined") {
      set({ initialized: true });
      return;
    }
    const token = localStorage.getItem("caseweb_token");
    if (!token) {
      set({ user: null, token: null, initialized: true });
      return;
    }
    set({ loading: true, token });
    try {
      const user = await authApi.me();
      set({ user, token, loading: false, initialized: true });
    } catch {
      localStorage.removeItem("caseweb_token");
      set({ user: null, token: null, loading: false, initialized: true });
    }
  },
}));
