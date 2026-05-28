import { useEffect, type ReactNode } from "react";
import { applyStrelaAppearance } from "@/lib/strela/appearance";
import { useProfile } from "./ProfileProvider";

/** Применяет CSS-переменные из branding.yaml поверх tokens.css темы */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { branding } = useProfile();

  useEffect(() => {
    applyStrelaAppearance(branding.appearance);
  }, [branding.appearance]);

  useEffect(() => {
    const root = document.documentElement;
    const { colors, fonts } = branding;
    const map: Record<string, string | undefined> = {
      "--color-primary": colors.primary,
      "--color-primary-fg": colors.primaryForeground,
      "--color-accent": colors.accent,
      "--color-background": colors.background,
      "--color-card-footer": colors.cardFooter,
      "--color-surface": colors.surface,
      "--color-text": colors.text,
      "--color-muted": colors.muted,
      "--font-body": fonts.body,
      "--font-accent": fonts.accent,
    };
    for (const [key, val] of Object.entries(map)) {
      if (val) root.style.setProperty(key, val);
    }
    document.body.style.background = colors.background ?? "";
    document.body.style.color = colors.text ?? "#1a1a1a";
  }, [branding]);

  return <>{children}</>;
}
