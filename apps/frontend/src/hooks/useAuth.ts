import { useCallback, useEffect, useState } from "react";
import {
  type AuthState,
  getMe,
  signIn as signInRequest,
  signOut as signOutRequest,
  signUp as signUpRequest,
} from "../api/client.js";

type AuthStatus = "loading" | "authenticated" | "anonymous";

export function useAuth() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const nextAuth = await getMe();
      setAuth(nextAuth);
      setStatus("authenticated");
    } catch {
      setAuth(null);
      setStatus("anonymous");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      await signInRequest(email, password);
      await refresh();
    },
    [refresh],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await signUpRequest(name, email, password);
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await signOutRequest();
    setAuth(null);
    setStatus("anonymous");
  }, []);

  return {
    auth,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    login,
    logout,
    refresh,
    register,
    status,
  };
}
