import type { ReactNode } from "react";
import { Link } from "wouter";
import { useProfile } from "@/providers/ProfileProvider";
import { SidebarBrandLayout } from "./variants/SidebarBrandLayout";
import { TopbarDarkLayout } from "./variants/TopbarDarkLayout";
import { MinimalLightLayout } from "./variants/MinimalLightLayout";
import { SidebarGradientLayout } from "./variants/SidebarGradientLayout";

const LAYOUTS: Record<string, React.ComponentType<{ children: ReactNode }>> = {
  "sidebar-brand": SidebarBrandLayout,
  "topbar-dark": TopbarDarkLayout,
  "minimal-light": MinimalLightLayout,
  "sidebar-gradient": SidebarGradientLayout,
};

export function AppShell({ children }: { children: ReactNode }) {
  const { branding, user, profile } = useProfile();
  const variant = branding.layoutVariant ?? "sidebar-brand";
  const Layout = LAYOUTS[variant] ?? SidebarBrandLayout;

  return (
    <Layout>
      <div className="mb-2 flex items-center justify-end gap-2 text-xs text-[var(--color-muted)]">
        <Link href="/cabinet" className="rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-50">
          Кабинет
        </Link>
        <span>
          {user?.displayName ?? "Гость"} · {profile.displayName}
        </span>
      </div>
      {children}
    </Layout>
  );
}
