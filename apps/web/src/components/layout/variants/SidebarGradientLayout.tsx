import type { ReactNode } from "react";
import { useProfile } from "@/providers/ProfileProvider";
import { ShellHeader } from "../ShellHeader";

/** Aqua: градиентная боковая панель */
export function SidebarGradientLayout({ children }: { children: ReactNode }) {
  const { branding } = useProfile();

  return (
    <div className="flex min-h-screen">
      <aside
        className="flex w-24 shrink-0 flex-col items-center justify-center px-2 text-white"
        style={{
          background: `linear-gradient(180deg, var(--color-primary), var(--color-card-footer))`,
        }}
      >
        <span
          className="font-bold"
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontFamily: "var(--font-accent)",
            fontSize: "1.1rem",
          }}
        >
          {branding.sidebar.logoText}
        </span>
      </aside>
      <div className="flex flex-1 flex-col bg-[var(--color-background)]">
        <ShellHeader />
        <main className="flex-1 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
