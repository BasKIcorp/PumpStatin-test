import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuthStore } from "@/stores/authStore";

export function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Redirect to="/login" />;
  return <>{children}</>;
}
