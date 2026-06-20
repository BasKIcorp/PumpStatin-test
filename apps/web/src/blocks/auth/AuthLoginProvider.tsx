import { createContext, useContext, type ReactNode } from "react";
import { useLoginForm } from "./useLoginForm";

type LoginFormState = ReturnType<typeof useLoginForm>;

const AuthLoginContext = createContext<LoginFormState | null>(null);

export function AuthLoginProvider({ children }: { children: ReactNode }) {
  const form = useLoginForm();
  return <AuthLoginContext.Provider value={form}>{children}</AuthLoginContext.Provider>;
}

export function useAuthLogin() {
  const ctx = useContext(AuthLoginContext);
  if (!ctx) {
    throw new Error("useAuthLogin requires AuthLoginProvider");
  }
  return ctx;
}
