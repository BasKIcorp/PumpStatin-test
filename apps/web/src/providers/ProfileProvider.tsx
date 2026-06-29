import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { fetchSession } from "@/api/auth";
import { fetchGuestProfile, type ProfileBundle } from "@/api/config";
import { loadTheme } from "@/lib/themeRegistry";
import { useAuthStore } from "@/stores/authStore";
import { useWizardStore } from "@/stores/wizardStore";
import { readPersistedWizardStep, persistWizardStep } from "@/lib/wizardPersistence";
import { ThemeProvider } from "./ThemeProvider";
import { StudioProfileContext } from "./StudioProfileProvider";

const ProfileContext = createContext<ProfileBundle | null>(null);

export function ProfileProvider({
  children,
  guestOnly = false,
}: {
  children: ReactNode;
  guestOnly?: boolean;
}) {
  const [profile, setProfile] = useState<ProfileBundle | null>(null);
  const [themeReady, setThemeReady] = useState(false);
  const token = useAuthStore((s) => s.token);

  const reload = useCallback(async () => {
    setThemeReady(false);
    try {
      const data = guestOnly ? await fetchGuestProfile() : await fetchSession();
      await loadTheme(data.profile.theme);
      if (!guestOnly) {
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
        const profileId = data.profile.id;
        const steps =
          (data.wizard?.navigation as { steps?: Array<{ id: string }> } | undefined)?.steps ?? [];
        const stepIds = steps.map((s) => s.id);
        const firstStep = stepIds[0] ?? "product-class";
        const prevProfile = sessionStorage.getItem("pumpstation-wizard-profile");

        if (prevProfile !== profileId) {
          sessionStorage.setItem("pumpstation-wizard-profile", profileId);
          const restored = readPersistedWizardStep(profileId, stepIds);
          useWizardStore.setState({
            step: restored ?? firstStep,
            productClass: undefined,
            productLine: undefined,
            hmLine: undefined,
            puLine: undefined,
            simpelLine: undefined,
            installationType: undefined,
            flowId: undefined,
            formValues: {},
            matchedPumps: null,
            stationResult: null,
          });
          if (restored) persistWizardStep(profileId, restored);
        }
      }
      setProfile(data);
    } catch (err) {
      console.error("Profile load failed, falling back to guest profile", err);
      const data = await fetchGuestProfile();
      await loadTheme(data.profile.theme);
      setProfile(data);
    } finally {
      setThemeReady(true);
    }
  }, [guestOnly, token]);

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
  const studio = useContext(StudioProfileContext);
  const ctx = useContext(ProfileContext);
  const bundle = studio ?? ctx;
  if (!bundle) throw new Error("useProfile must be used within ProfileProvider");
  return bundle;
}

/** Перезагрузить профиль после входа */
export function useReloadProfile() {
  const ctx = useContext(ProfileContext);
  void ctx;
  return useAuthStore.getState;
}
