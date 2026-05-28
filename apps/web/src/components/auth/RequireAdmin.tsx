import { useEffect, useState, type ReactNode } from "react";
import { Redirect } from "wouter";
import { fetchMe } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecked(true);
      setAllowed(false);
      return;
    }
    if (user?.role === "admin") {
      setAllowed(true);
      setChecked(true);
      return;
    }
    fetchMe()
      .then((me) => {
        const role = me.role ?? me.user?.role ?? "user";
        if (token && me.user) {
          setSession(token, { ...me.user, role });
        }
        setAllowed(role === "admin");
      })
      .catch(() => setAllowed(false))
      .finally(() => setChecked(true));
  }, [token, user?.role, setSession]);

  if (!token) return <Redirect to="/login" />;
  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100 text-sm text-neutral-600">
        Проверка доступа…
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-100 p-6">
        <p className="text-sm text-neutral-700">Нет прав администратора.</p>
        <a href="/" className="text-sm font-medium text-[#13347f] hover:underline">
          ← К подбору
        </a>
      </div>
    );
  }
  return <>{children}</>;
}
