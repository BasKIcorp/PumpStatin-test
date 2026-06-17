import type { ReactNode } from "react";
import { FIGMA } from "./figmaTokens";

export function StudioRightSidebar({ children }: { children: ReactNode }) {
  return (
    <aside
      className="flex w-[260px] shrink-0 flex-col overflow-y-auto"
      style={{ background: FIGMA.panel, borderLeft: `1px solid ${FIGMA.panelBorder}` }}
    >
      <div
        className="shrink-0 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#888]"
        style={{ borderBottom: `1px solid ${FIGMA.panelBorder}` }}
      >
        Свойства
      </div>
      <div className="flex-1 p-3">{children}</div>
    </aside>
  );
}
