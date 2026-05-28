import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";

const ADMIN_BASE = "/admin";
import { useAuthStore } from "@/stores/authStore";

const NAV = [
  { href: `${ADMIN_BASE}`, label: "Обзор", end: true },
  { href: `${ADMIN_BASE}/users`, label: "Пользователи" },
  { href: `${ADMIN_BASE}/profiles`, label: "Профили и фронт" },
  { href: `${ADMIN_BASE}/database`, label: "База данных" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex min-h-screen bg-neutral-100 text-neutral-900">
      <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Админ-панель
          </p>
          <p className="mt-1 truncate text-sm font-medium">{user?.displayName}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {NAV.map((item) => {
            const active = item.end ? path === item.href : path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-[#13347f] font-medium text-white"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-neutral-200 p-2">
          <Link
            href="/"
            className="block rounded-md px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            ← Подбор
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              window.location.assign("/login");
            }}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
          >
            Выйти
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
