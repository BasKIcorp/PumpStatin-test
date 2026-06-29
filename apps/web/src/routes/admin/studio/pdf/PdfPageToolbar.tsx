import { FIGMA } from "../figma/figmaTokens";
import type { PdfPageDefaults } from "./pdfPageDefaults";

const inputClass =
  "w-16 rounded border-0 px-1.5 py-0.5 text-[10px] text-white outline-none focus:ring-1 focus:ring-[#0d99ff]";

export function PdfPageToolbar({
  pageCount,
  currentPageIndex,
  onAddPage,
  onRemovePage,
  onSelectPage,
  pageDefaults,
  onPageDefaultsChange,
}: {
  pageCount: number;
  currentPageIndex: number;
  onAddPage: () => void;
  onRemovePage: () => void;
  onSelectPage: (index: number) => void;
  pageDefaults: PdfPageDefaults;
  onPageDefaultsChange: (next: PdfPageDefaults) => void;
}) {
  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-3 border-b px-3 py-1.5"
      style={{ background: "#2c2c2c", borderColor: "#3d3d3d" }}
      data-testid="pdf-page-toolbar"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#666]">Страницы</span>
      <div className="flex flex-wrap items-center gap-1">
        {Array.from({ length: pageCount }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelectPage(i)}
            aria-pressed={currentPageIndex === i}
            data-testid={`pdf-page-tab-${i + 1}`}
            className="rounded px-2 py-0.5 text-[10px]"
            style={
              currentPageIndex === i
                ? { background: FIGMA.accentSoft, color: FIGMA.accent }
                : { background: "#383838", color: FIGMA.textMuted }
            }
          >
            {i + 1}
          </button>
        ))}
        <button
          type="button"
          onClick={onAddPage}
          className="rounded px-2 py-0.5 text-[10px] text-[#aaa] hover:bg-[#383838]"
          title="Добавить страницу"
        >
          +
        </button>
        <button
          type="button"
          onClick={onRemovePage}
          disabled={pageCount <= 1}
          className="rounded px-2 py-0.5 text-[10px] text-[#aaa] hover:bg-[#383838] disabled:opacity-40"
          title="Удалить страницу"
        >
          −
        </button>
      </div>

      <span className="hidden h-4 w-px bg-[#444] sm:block" aria-hidden />

      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#666]">Размер (pt)</span>
      <label className="flex items-center gap-1 text-[10px] text-[#888]">
        W
        <input
          type="number"
          className={inputClass}
          style={{ background: FIGMA.inputBg }}
          value={pageDefaults.width}
          onChange={(e) =>
            onPageDefaultsChange({ ...pageDefaults, width: Number(e.target.value) || 0 })
          }
        />
      </label>
      <label className="flex items-center gap-1 text-[10px] text-[#888]">
        H
        <input
          type="number"
          className={inputClass}
          style={{ background: FIGMA.inputBg }}
          value={pageDefaults.height}
          onChange={(e) =>
            onPageDefaultsChange({ ...pageDefaults, height: Number(e.target.value) || 0 })
          }
        />
      </label>
      <label className="flex items-center gap-1 text-[10px] text-[#888]">
        ↑
        <input
          type="number"
          className={inputClass}
          style={{ background: FIGMA.inputBg }}
          value={pageDefaults.marginTop}
          onChange={(e) =>
            onPageDefaultsChange({ ...pageDefaults, marginTop: Number(e.target.value) || 0 })
          }
        />
      </label>
      <label className="flex items-center gap-1 text-[10px] text-[#888]">
        ↓
        <input
          type="number"
          className={inputClass}
          style={{ background: FIGMA.inputBg }}
          value={pageDefaults.marginBottom}
          onChange={(e) =>
            onPageDefaultsChange({ ...pageDefaults, marginBottom: Number(e.target.value) || 0 })
          }
        />
      </label>
      <label className="flex items-center gap-1 text-[10px] text-[#888]">
        ←
        <input
          type="number"
          className={inputClass}
          style={{ background: FIGMA.inputBg }}
          value={pageDefaults.marginLeft}
          onChange={(e) =>
            onPageDefaultsChange({ ...pageDefaults, marginLeft: Number(e.target.value) || 0 })
          }
        />
      </label>
      <label className="flex items-center gap-1 text-[10px] text-[#888]">
        →
        <input
          type="number"
          className={inputClass}
          style={{ background: FIGMA.inputBg }}
          value={pageDefaults.marginRight}
          onChange={(e) =>
            onPageDefaultsChange({ ...pageDefaults, marginRight: Number(e.target.value) || 0 })
          }
        />
      </label>
    </div>
  );
}
