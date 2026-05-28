import type { ReactNode } from "react";
import { useProfile } from "@/providers/ProfileProvider";
import { Link } from "wouter";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

/** ACME: тёмный topbar, без боковой панели */
export function TopbarDarkLayout({ children }: { children: ReactNode }) {
  const { branding } = useProfile();
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      <div className="border-b border-[var(--color-accent)] bg-[var(--color-surface)] px-6 py-4">
        <div className="flex items-center justify-between">
          <h1
            className="text-xl font-bold tracking-wider"
            style={{ color: "var(--color-accent)" }}
          >
            {branding.sidebar.logoText}
          </h1>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/login" className="opacity-90 hover:opacity-100">
              {branding.copy.loginLabel}
            </Link>
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = "/login";
              }}
              aria-label="Выйти"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
      <main className="p-6 md:p-10">{children}</main>
    </div>
  );
}
