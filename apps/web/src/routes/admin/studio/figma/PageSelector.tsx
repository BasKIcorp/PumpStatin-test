import { useRef, useState } from "react";
import type { PageConfig } from "@pumpstation/contracts";
import { listPagesForSelector } from "@/routes/admin/studio/studioPages";
import { FIGMA } from "./figmaTokens";

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  auth: { label: "Вход", className: "bg-blue-900/50 text-blue-300" },
  wizard: { label: "Подбор", className: "bg-yellow-900/50 text-yellow-400" },
  cabinet: { label: "Кабинет", className: "bg-purple-900/50 text-purple-300" },
  page: { label: "Сайт", className: "bg-neutral-700/80 text-neutral-300" },
};

const TYPE_ORDER: Record<string, number> = {
  auth: 0,
  wizard: 1,
  cabinet: 2,
  page: 3,
};

function sortPages(pages: PageConfig[]): PageConfig[] {
  return [...pages].sort((a, b) => {
    const ta = TYPE_ORDER[a.type ?? "page"] ?? 9;
    const tb = TYPE_ORDER[b.type ?? "page"] ?? 9;
    if (ta !== tb) return ta - tb;
    return a.title.localeCompare(b.title, "ru");
  });
}

function typeBadge(page: PageConfig) {
  const key = page.type ?? "page";
  const badge = TYPE_BADGE[key] ?? TYPE_BADGE.page;
  return (
    <span className={`shrink-0 rounded px-1 text-[9px] ${badge.className}`}>{badge.label}</span>
  );
}

export function PageSelector({
  pages,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
}: {
  pages: PageConfig[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = pages.find((p) => p.id === selectedId);
  const sortedPages = sortPages(listPagesForSelector(pages));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[220px] items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white hover:bg-[#383838]"
      >
        <span className="truncate font-medium">{selected?.title ?? "Страница"}</span>
        <span className="text-[10px] text-[#888]">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg shadow-xl"
            style={{ background: FIGMA.panel, border: `1px solid ${FIGMA.panelBorder}` }}
          >
            <div
              className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#888]"
              style={{ borderBottom: `1px solid ${FIGMA.panelBorder}` }}
            >
              <span>Страницы</span>
              <button
                type="button"
                onClick={() => {
                  onAdd();
                  setOpen(false);
                }}
                className="rounded px-1.5 py-0.5 text-[#0d99ff] hover:bg-[#383838]"
              >
                + Новая
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {sortedPages.map((p) => (
                <div
                  key={p.id}
                  className="group flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-[#383838]"
                  style={
                    selectedId === p.id
                      ? { background: FIGMA.accentSoft, color: FIGMA.accent }
                      : { color: FIGMA.text }
                  }
                  onClick={() => {
                    onSelect(p.id);
                    setOpen(false);
                  }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm">
                      {typeBadge(p)}
                      <span className="truncate">{p.title}</span>
                    </div>
                    <div className="truncate font-mono text-[10px] text-[#666]">{p.route}</div>
                  </div>
                  {p.type !== "wizard" && p.type !== "auth" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(p.id);
                      }}
                      className="invisible rounded px-1 text-xs text-red-400 group-hover:visible hover:bg-red-900/30"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
