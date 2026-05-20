import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import axios, { ensureCsrf } from "./csrf";

/** Увеличивается при login/register/logout, чтобы ответ «стартового» GET /api/auth/user/ не затирал сессию после входа. */
let authEpoch = 0;

/** Демо-вход в ЛК без формы (совпадает с seed SQLite). */
export const DEMO_ADMIN_EMAIL = "admin@strela.local";
export const DEMO_ADMIN_PASSWORD = "admin12345";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: "user" | "admin";
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionProbeAbortRef = useRef<AbortController | null>(null);

  const loginAsDemoAdmin = useCallback(async (epochAtStart: number) => {
    try {
      await ensureCsrf();
      const r = await axios.post("/api/auth/login/", {
        email: DEMO_ADMIN_EMAIL,
        password: DEMO_ADMIN_PASSWORD,
      });
      if (epochAtStart !== authEpoch) return;
      setUser(r.data);
    } catch {
      if (epochAtStart !== authEpoch) return;
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    sessionProbeAbortRef.current = ac;
    const epochAtStart = authEpoch;

    async function bootstrapSession() {
      try {
        const r = await axios.get("/api/auth/user/", { signal: ac.signal });
        if (epochAtStart !== authEpoch) return;
        setUser(r.data);
      } catch (err: unknown) {
        if (epochAtStart !== authEpoch) return;
        const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined;
        if (code === "ERR_CANCELED" || code === "ECONNABORTED") return;
        await loginAsDemoAdmin(epochAtStart);
      } finally {
        if (epochAtStart !== authEpoch) return;
        setLoading(false);
      }
    }

    void bootstrapSession();
    return () => {
      ac.abort();
    };
  }, [loginAsDemoAdmin]);

  const login = useCallback(async (email: string, password: string) => {
    sessionProbeAbortRef.current?.abort();
    authEpoch += 1;
    try {
      await ensureCsrf();
      const r = await axios.post("/api/auth/login/", { email, password });
      flushSync(() => {
        setUser(r.data);
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    sessionProbeAbortRef.current?.abort();
    authEpoch += 1;
    try {
      await ensureCsrf();
      const r = await axios.post("/api/auth/register/", { email, password, name });
      flushSync(() => {
        setUser(r.data);
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    sessionProbeAbortRef.current?.abort();
    authEpoch += 1;
    try {
      await ensureCsrf();
      await axios.post("/api/auth/logout/");
      flushSync(() => {
        setUser(null);
      });
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
