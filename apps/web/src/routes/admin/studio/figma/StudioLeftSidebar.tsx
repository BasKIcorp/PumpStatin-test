import { useState, type ReactNode } from "react";
import { FIGMA } from "./figmaTokens";

type LeftTab = "layers" | "assets";

export function StudioLeftSidebar({ layers, assets }: { layers: ReactNode; assets: ReactNode }) {
  const [tab, setTab] = useState<LeftTab>("layers");

  return (
    <aside
      className="flex w-[240px] shrink-0 flex-col"
      style={{ background: FIGMA.panel, borderRight: `1px solid ${FIGMA.panelBorder}` }}
    >
      <div
        className="flex shrink-0"
        style={{ borderBottom: `1px solid ${FIGMA.panelBorder}` }}
      >
        {(
          [
            { id: "layers" as const, label: "Слои" },
            { id: "assets" as const, label: "Блоки" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="flex-1 py-2.5 text-center text-[11px] font-medium uppercase tracking-wide"
            style={
              tab === t.id
                ? {
                    color: FIGMA.text,
                    borderBottom: `2px solid ${FIGMA.accent}`,
                    marginBottom: -1,
                  }
                : { color: FIGMA.textDim }
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">{tab === "layers" ? layers : assets}</div>
    </aside>
  );
}
