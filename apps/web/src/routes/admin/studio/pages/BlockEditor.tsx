import { useState } from "react";
import type { BlockConfig } from "@pumpstation/contracts";

const BLOCK_TYPES = ["hero", "rich-text", "card-grid", "wizard"];

const BLOCK_LABELS: Record<string, string> = {
  hero: "Hero (заголовок + CTA)",
  "rich-text": "Rich Text (контент)",
  "card-grid": "Card Grid (сетка карточек)",
  wizard: "Визард подбора",
};

const BLOCK_DEFAULTS: Record<string, Record<string, unknown>> = {
  hero: {
    heading: "Заголовок",
    subheading: "Подзаголовок",
    cta: { label: "Подобрать", pageId: "wizard" },
    background: "#1e4a8c",
  },
  "rich-text": {
    content: "<p>Текст страницы</p>",
  },
  "card-grid": {
    columns: 3,
    cards: [
      { icon: "settings", title: "Особенность 1", text: "Описание" },
    ],
  },
  wizard: {},
};

export function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: BlockConfig[];
  onChange: (blocks: BlockConfig[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = blocks.find((b) => b.id === selectedId);

  const addBlock = () => {
    const id = `block-${Date.now()}`;
    const type = "hero";
    onChange([
      ...blocks,
      { id, type, props: { ...BLOCK_DEFAULTS[type] } },
    ]);
    setSelectedId(id);
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const newBlocks = [...blocks];
    const target = index + direction;
    if (target < 0 || target >= newBlocks.length) return;
    [newBlocks[index], newBlocks[target]] = [newBlocks[target], newBlocks[index]];
    onChange(newBlocks);
  };

  const updateBlock = (id: string, patch: Partial<BlockConfig>) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const updateProp = (id: string, key: string, value: unknown) => {
    onChange(
      blocks.map((b) =>
        b.id === id ? { ...b, props: { ...b.props, [key]: value } } : b,
      ),
    );
  };

  return (
    <div className="flex gap-4">
      {/* Список блоков */}
      <div className="w-72 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-700">Блоки</h3>
          <button
            type="button"
            onClick={addBlock}
            className="rounded bg-[#13347f] px-2 py-0.5 text-xs text-white"
          >
            + Блок
          </button>
        </div>
        <div className="space-y-1">
          {blocks.map((block, i) => (
            <div
              key={block.id}
              className={`group flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm ${
                selectedId === block.id
                  ? "bg-[#13347f] text-white"
                  : "text-neutral-700 hover:bg-neutral-100"
              }`}
              onClick={() => setSelectedId(block.id)}
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-neutral-200 px-1 text-[10px] text-neutral-600">
                  {block.type}
                </span>
                <span className="truncate">{block.id}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveBlock(i, -1);
                  }}
                  className="invisible rounded px-1 text-xs hover:bg-black/10 group-hover:visible"
                  disabled={i === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveBlock(i, 1);
                  }}
                  className="invisible rounded px-1 text-xs hover:bg-black/10 group-hover:visible"
                  disabled={i === blocks.length - 1}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBlock(block.id);
                  }}
                  className="invisible rounded px-1 text-xs text-red-500 hover:bg-red-50 group-hover:visible"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {blocks.length === 0 && (
            <p className="py-4 text-center text-xs text-neutral-400">
              Нет блоков. Нажмите «+ Блок» чтобы добавить.
            </p>
          )}
        </div>
      </div>

      {/* Properties — если выбран блок */}
      <div className="min-w-0 flex-1">
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Свойства блока: {selected.id}</h3>
              <select
                className="rounded border border-neutral-300 px-2 py-1 text-xs"
                value={selected.type}
                onChange={(e) => {
                  const newType = e.target.value;
                  updateBlock(selected.id, {
                    type: newType,
                    props: { ...BLOCK_DEFAULTS[newType] },
                  });
                }}
              >
                {BLOCK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {BLOCK_LABELS[t] ?? t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {/* Hero props */}
              {selected.type === "hero" && (
                <>
                  <PropField
                    label="Заголовок"
                    value={String(selected.props.heading ?? "")}
                    onChange={(v) => updateProp(selected.id, "heading", v)}
                  />
                  <PropField
                    label="Подзаголовок"
                    value={String(selected.props.subheading ?? "")}
                    onChange={(v) => updateProp(selected.id, "subheading", v)}
                  />
                  <PropField
                    label="Текст кнопки"
                    value={String((selected.props.cta as any)?.label ?? "")}
                    onChange={(v) =>
                      updateProp(selected.id, "cta", {
                        label: v,
                      } as any)
                    }
                  />
                  <PropField
                    label="Цвет фона"
                    type="color"
                    value={String(selected.props.background ?? "#1e4a8c")}
                    onChange={(v) => updateProp(selected.id, "background", v)}
                  />
                </>
              )}

              {/* RichText props */}
              {selected.type === "rich-text" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
                    HTML-контент
                  </label>
                  <textarea
                    className="min-h-[200px] w-full rounded border border-neutral-300 p-2 font-mono text-xs"
                    value={String(selected.props.content ?? "")}
                    onChange={(e) => updateProp(selected.id, "content", e.target.value)}
                  />
                </div>
              )}

              {/* CardGrid props */}
              {selected.type === "card-grid" && (
                <>
                  <PropField
                    label="Колонок"
                    type="number"
                    value={String(selected.props.columns ?? 3)}
                    onChange={(v) => updateProp(selected.id, "columns", Number(v))}
                  />
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">
                      Карточки (JSON)
                    </label>
                    <textarea
                      className="min-h-[150px] w-full rounded border border-neutral-300 p-2 font-mono text-xs"
                      value={JSON.stringify(selected.props.cards ?? [], null, 2)}
                      onChange={(e) => {
                        try {
                          updateProp(selected.id, "cards", JSON.parse(e.target.value));
                        } catch {
                          // ignore parse errors while typing
                        }
                      }}
                    />
                  </div>
                </>
              )}

              {/* Wizard props */}
              {selected.type === "wizard" && (
                <p className="text-sm text-neutral-500">
                  Блок визарда не требует дополнительных настроек. Шаги редактируются во вкладке «Визард».
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-neutral-400">
            Выберите блок слева, чтобы редактировать его свойства.
          </p>
        )}
      </div>
    </div>
  );
}

function PropField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-600">{label}</label>
      <input
        type={type}
        className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
