import type { ReactNode } from "react";
import { useProfile } from "@/providers/ProfileProvider";
import { ShellHeader } from "../ShellHeader";

/** Nord: светлый минимализм, логотип слева в шапке */
export function MinimalLightLayout({ children }: { children: ReactNode }) {
  const { branding } = useProfile();

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="flex items-center justify-between border-b border-neutral-300 bg-[var(--color-surface)] px-8 py-4">
        <span className="text-lg font-semibold text-[var(--color-primary)]">
          {branding.sidebar.logoText}
        </span>
        <ShellHeader />
      </header>
      <main className="mx-auto max-w-5xl p-8">{children}</main>
    </div>
  );
}
