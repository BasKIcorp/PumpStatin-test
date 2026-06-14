import type { ReactNode } from "react";
import { TabNav, STUDIO_TABS } from "./TabNav";

export function StudioShell({
  profileId,
  children,
  activeTab,
  onTabChange,
}: {
  profileId: string;
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  return (
    <div className="flex h-full min-h-[calc(100vh-8rem)] gap-4">
      {/* Левая панель — вкладки */}
      <aside className="w-48 shrink-0">
        <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {profileId}
        </div>
        <TabNav
          tabs={STUDIO_TABS}
          activeTab={activeTab}
          onSelect={onTabChange}
        />
      </aside>

      {/* Центр — canvas / редактор */}
      <div className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white p-4">
        {children}
      </div>
    </div>
  );
}
