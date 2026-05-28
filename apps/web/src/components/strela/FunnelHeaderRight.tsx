import { Link } from "wouter";
import { useProfile } from "@/providers/ProfileProvider";
import { useAuthStore } from "@/stores/authStore";

export function FunnelHeaderRight({ loginLabel = "Войти" }: { loginLabel?: string }) {
  const { user } = useProfile();
  const authUser = useAuthStore((s) => s.user);
  const isAdmin = authUser?.role === "admin" || (user as { role?: string } | null)?.role === "admin";

  if (user) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        {isAdmin ? (
          <Link
            href="/admin"
            className="text-sm font-semibold text-[var(--funnel-primary)] hover:underline"
          >
            Админ
          </Link>
        ) : null}
        <Link
          href="/login"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/20 text-gray-700 transition-colors hover:bg-gray-50"
          title={user.displayName}
        >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        </Link>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="text-sm font-semibold text-[var(--funnel-primary)] hover:underline"
    >
      {loginLabel}
    </Link>
  );
}
