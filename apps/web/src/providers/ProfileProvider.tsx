import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { fetchSession } from "@/api/auth";
import type { ProfileBundle } from "@/api/config";
import { loadTheme } from "@/lib/themeRegistry";
import { useAuthStore } from "@/stores/authStore";
import { ThemeProvider } from "./ThemeProvider";

const ProfileContext = createContext<ProfileBundle | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileBundle | null>(null);
  const [themeReady, setThemeReady] = useState(false);
  const token = useAuthStore((s) => s.token);

  const reload = useCallback(async () => {
    setThemeReady(false);
    const data = await fetchSession();
    await loadTheme(data.profile.theme);
    const sessionUser = data.user as { role?: string } | null | undefined;
    if (sessionUser && token) {
      const current = useAuthStore.getState().user;
      if (current) {
        useAuthStore.getState().setSession(token, {
          ...current,
          role: sessionUser.role ?? current.role,
        });
      }
    }
    setProfile(data);
    setThemeReady(true);
  }, []);

  useEffect(() => {
    reload().catch(console.error);
  }, [reload, token]);

  if (!profile || !themeReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        Загрузка…
      </div>
    );
  }

  return (
    <ProfileContext.Provider value={profile}>
      <ThemeProvider>{children}</ThemeProvider>
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}

/** Перезагрузить профиль после входа */
export function useReloadProfile() {
  const ctx = useContext(ProfileContext);
  void ctx;
  return useAuthStore.getState;
}
