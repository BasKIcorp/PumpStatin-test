import { useEffect, useState } from "react";
import { fetchDemoAccounts, login, type DemoAccount } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";

export const DEMO_PASSWORD = "demo123";

export function useLoginForm() {
  const setSession = useAuthStore((s) => s.setSession);
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDemoAccounts()
      .then((r) => setAccounts(r.accounts))
      .catch(() => setAccounts([]));
  }, []);

  const doLogin = async (username: string, pass: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await login(username, pass);
      const role = res.role ?? res.user.role ?? "user";
      setSession(res.accessToken, { ...res.user, role });
      window.location.assign(role === "admin" ? "/admin" : "/");
    } catch {
      setError("Неверный логин или пароль");
    } finally {
      setLoading(false);
    }
  };

  return {
    accounts,
    email,
    setEmail,
    password,
    setPassword,
    error,
    loading,
    doLogin,
    demoPassword: DEMO_PASSWORD,
  };
}
