import {
  CONSTRUCTOR_TABS,
  FRONTEND_MODES,
  type ConstructorTab,
  type FrontendMode,
} from "@/routes/admin/studio/studioTabs";
import type { PageConfig } from "@pumpstation/contracts";
import { PageSelector } from "./PageSelector";
import { FIGMA } from "./figmaTokens";

export function StudioEditorTopBar({
  profileTitle,
  pages,
  selectedPageId,
  onSelectPage,
  onAddPage,
  onDeletePage,
  activeTab,
  onTabChange,
  frontendMode,
  onFrontendModeChange,
  onSave,
  onPreview,
  saveMsg,
  contextLabel,
  dirtyHint,
}: {
  profileTitle: string;
  pages?: PageConfig[];
  selectedPageId?: string | null;
  onSelectPage?: (id: string) => void;
  onAddPage?: () => void;
  onDeletePage?: (id: string) => void;
  activeTab: ConstructorTab;
  onTabChange: (tab: ConstructorTab) => void;
  frontendMode?: FrontendMode;
  onFrontendModeChange?: (mode: FrontendMode) => void;
  onSave?: () => void;
  onPreview?: () => void;
  saveMsg?: string;
  contextLabel?: string;
  /** Несохранённые изменения */
  dirtyHint?: string;
}) {
  const showPageSelector =
    activeTab === "frontend" &&
    frontendMode !== "settings" &&
    pages &&
    onSelectPage &&
    onAddPage &&
    onDeletePage;

  return (
    <header
      className="flex h-11 shrink-0 items-center gap-3 px-3"
      style={{ background: FIGMA.panel, borderBottom: `1px solid ${FIGMA.panelBorder}` }}
    >
      <span className="hidden max-w-[200px] truncate text-xs text-[#888] lg:inline">{profileTitle}</span>
      <span className="text-[#555]">/</span>

      {showPageSelector ? (
        <PageSelector
          pages={pages}
          selectedId={selectedPageId ?? null}
          onSelect={onSelectPage}
          onAdd={onAddPage}
          onDelete={onDeletePage}
        />
      ) : (
        <span className="text-sm font-medium text-white">{contextLabel ?? "Конструктор"}</span>
      )}

      <nav className="ml-2 flex items-center gap-0.5">
        {CONSTRUCTOR_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className="rounded px-2.5 py-1 text-xs transition-colors"
            style={
              activeTab === tab.id
                ? { background: FIGMA.accentSoft, color: FIGMA.accent }
                : { color: FIGMA.textMuted }
            }
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "frontend" && onFrontendModeChange && (
        <nav className="ml-1 flex items-center gap-0.5 border-l pl-2" style={{ borderColor: FIGMA.panelBorder }}>
          {FRONTEND_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onFrontendModeChange(mode.id)}
              className="rounded px-2 py-1 text-[11px] transition-colors"
              style={
                frontendMode === mode.id
                  ? { background: "#383838", color: FIGMA.text }
                  : { color: FIGMA.textDim }
              }
            >
              {mode.label}
            </button>
          ))}
        </nav>
      )}

      <div className="flex-1" />

      {dirtyHint && !saveMsg && (
        <span className="rounded bg-amber-900/30 px-2 py-0.5 text-[11px] text-amber-400">{dirtyHint}</span>
      )}

      {saveMsg && (
        <span className="rounded bg-green-900/40 px-2 py-0.5 text-[11px] text-green-400">{saveMsg}</span>
      )}

      {onPreview && (
        <button
          type="button"
          onClick={onPreview}
          className="rounded px-3 py-1 text-xs text-[#b3b3b3] hover:bg-[#383838] hover:text-white"
        >
          Превью
        </button>
      )}

      {onSave && (
        <button
          type="button"
          onClick={onSave}
          className="rounded px-3 py-1 text-xs font-medium text-white"
          style={{ background: FIGMA.accent }}
        >
          Сохранить
        </button>
      )}
    </header>
  );
}
