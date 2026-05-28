import type { ReactNode } from "react";
import { useProfile } from "@/providers/ProfileProvider";
import { FUNNEL_SIDEBAR_WORDMARK_DEFAULT } from "@/lib/strela/selectionAssets";
import { ShellHeader } from "../ShellHeader";

export function SidebarBrandLayout({ children }: { children: ReactNode }) {
  const { branding } = useProfile();
  const wordmarkSrc = branding.appearance?.funnel_sidebar_wordmark_url ?? FUNNEL_SIDEBAR_WORDMARK_DEFAULT;

  return (
    <div className="flex min-h-screen">
      <aside
        className="flex w-20 shrink-0 items-center justify-center bg-[var(--color-primary)] text-[var(--color-primary-fg)] md:w-24"
        aria-label="Бренд"
      >
        <img
          src={wordmarkSrc}
          alt={branding.sidebar.logoText}
          className="h-[52%] w-auto max-w-[85%] object-contain"
          decoding="async"
        />
      </aside>
      <div className="flex flex-1 flex-col bg-[var(--color-background)]">
        <ShellHeader />
        <main className="flex-1 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
