import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";

import { cn } from "@/lib/cn";
import { AdminLayoutContext } from "@/pages/admin/adminLayoutContext";
import { useAuthStore } from "@/stores/authStore";
import { useWizardRoute } from "@/providers/SiteConfigProvider";

const SIDEBAR_STORAGE_KEY = "admin-sidebar-open";

/** Пути относительно Router base="/admin" в AdminApp */
const NAV = [
  { href: "/", label: "Обзор", end: true },
  { href: "/users", label: "Пользователи" },
  { href: "/profiles", label: "Профили и фронт" },
  { href: "/database", label: "База данных" },
];

function readSidebarOpen(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function SidebarToggle({
  open,
  onToggle,
  className,
}: {
  open: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 hover:text-neutral-900",
        className,
      )}
      aria-label={open ? "Скрыть меню" : "Показать меню"}
      aria-expanded={open}
      title={open ? "Скрыть меню" : "Показать меню"}
    >
      <svg
        className={cn("h-4 w-4 transition-transform", !open && "rotate-180")}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const wizardRoute = useWizardRoute();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen));
    } catch {
      /* ignore */
    }
  }, [sidebarOpen]);

  return (
    <AdminLayoutContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      <div className="flex min-h-screen w-full bg-neutral-100 text-neutral-900">
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-neutral-200 bg-white transition-[width] duration-200 ease-out",
          sidebarOpen ? "w-56" : "hidden",
        )}
      >
        <div className="flex w-56 items-start justify-between gap-2 border-b border-neutral-200 px-4 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Админ-панель
            </p>
            <p className="mt-1 truncate text-sm font-medium">{user?.displayName}</p>
          </div>
          <SidebarToggle open={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
        </div>
        <nav className="flex w-56 flex-1 flex-col gap-0.5 p-2">
          {NAV.map((item) => {
            const active = item.end
              ? path === "/" || path === ""
              : path === item.href || path.startsWith(`${item.href}/`);
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
        <div className="w-56 space-y-1 border-t border-neutral-200 p-2">
          <Link
            href={wizardRoute}
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

      <div className="relative min-w-0 flex-1">
        {!sidebarOpen ? (
          <SidebarToggle
            open={sidebarOpen}
            onToggle={() => setSidebarOpen(true)}
            className="absolute left-3 top-3 z-40"
          />
        ) : null}
        <main
          className={cn(
            "min-h-screen w-full overflow-auto",
            sidebarOpen ? "p-6" : "p-6 pt-14",
          )}
        >
          {children}
        </main>
      </div>
    </div>
    </AdminLayoutContext.Provider>
  );
}
