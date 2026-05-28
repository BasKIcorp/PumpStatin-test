import { Link } from "wouter";
import { LogOut, User } from "lucide-react";
import { useProfile } from "@/providers/ProfileProvider";
import { useAuthStore } from "@/stores/authStore";

export function ShellHeader() {
  const { branding } = useProfile();
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="flex items-center justify-end gap-4 border-b border-neutral-200/20 px-6 py-3">
      <Link
        href="/cabinet"
        className="flex items-center gap-2 text-sm opacity-90 hover:opacity-100"
      >
        <User size={18} />
        {branding.copy.loginLabel ?? "Аккаунт"}
      </Link>
      <button
        type="button"
        onClick={() => {
          logout();
          window.location.href = "/login";
        }}
        className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100"
        title="Выйти"
      >
        <LogOut size={16} />
      </button>
    </header>
  );
}
