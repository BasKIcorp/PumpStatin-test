import type { BlockConfig, PageConfig } from "@pumpstation/contracts";
import { Palette } from "@/routes/admin/studio/palette/Palette";
import { StudioCanvas } from "./StudioCanvas";
import { CanvasBlock } from "./CanvasBlock";

/** Пропс-редактор для выбранного блока */
function BlockPropsEditor({
  block,
  onUpdateProps,
  onChangeType,
}: {
  block: BlockConfig;
  onUpdateProps: (key: string, value: unknown) => void;
  onChangeType: (type: string) => void;
}) {
  const renderField = (key: string, value: unknown) => {
    if (typeof value === "string" && value.startsWith("#")) {
      return (
        <div key={key} className="flex items-center gap-2">
          <label className="w-24 text-xs text-neutral-600">{key}</label>
          <input
            type="color"
            className="h-7 w-10 cursor-pointer rounded border"
            value={value}
            onChange={(e) => onUpdateProps(key, e.target.value)}
          />
          <input
            className="flex-1 rounded border px-2 py-1 text-xs font-mono"
            value={value}
            onChange={(e) => onUpdateProps(key, e.target.value)}
          />
        </div>
      );
    }
    if (typeof value === "string") {
      return (
        <div key={key}>
          <label className="mb-0.5 block text-xs text-neutral-600">{key}</label>
          <input
            className="w-full rounded border px-2 py-1 text-sm"
            value={value}
            onChange={(e) => onUpdateProps(key, e.target.value)}
          />
        </div>
      );
    }
    return (
      <div key={key}>
        <label className="mb-0.5 block text-xs text-neutral-600">{key}</label>
        <textarea
          className="w-full rounded border px-2 py-1 text-xs font-mono"
          rows={3}
          value={JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              onUpdateProps(key, JSON.parse(e.target.value));
            } catch {
              /* ignore parse errors */
            }
          }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-neutral-700">
          {block.id}
        </h3>
      </div>

      <div>
        <label className="mb-0.5 block text-xs text-neutral-600">Тип</label>
        <select
          className="w-full rounded border px-2 py-1 text-sm"
          value={block.type}
          onChange={(e) => onChangeType(e.target.value)}
        >
          <option value="hero">Hero</option>
          <option value="rich-text">Rich Text</option>
          <option value="card-grid">Card Grid</option>
          <option value="wizard">Wizard</option>
        </select>
      </div>

      <hr className="border-neutral-200" />

      <h4 className="text-[11px] font-semibold uppercase text-neutral-500">Свойства</h4>
      <div className="space-y-2">
        {Object.entries(block.props).map(([key, value]) => renderField(key, value))}
      </div>
    </div>
  );
}

export function VisualPageEditor({
  blocks,
  page,
  onPageChange,
  onBlocksChange,
  selectedBlockId,
  onSelectBlock,
}: {
  blocks: BlockConfig[];
  page: PageConfig;
  onPageChange: (patch: Partial<PageConfig>) => void;
  onBlocksChange: (blocks: BlockConfig[]) => void;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onSave: () => void;
}) {
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null;

  const addBlock = (type: string) => {
    const defaults: Record<string, Record<string, unknown>> = {
      hero: { heading: "Заголовок", subheading: "Подзаголовок", cta: { label: "Подобрать", pageId: "wizard" }, background: "#1e4a8c" },
      "rich-text": { content: "<p>Текст</p>" },
      "card-grid": { columns: 3, cards: [{ icon: "settings", title: "Особенность", text: "Описание" }] },
      wizard: {},
    };
    const id = `block-${Date.now()}`;
    const newBlocks = [...blocks, { id, type, props: { ...(defaults[type] ?? {}) } }];
    onBlocksChange(newBlocks);
    onSelectBlock(id);
  };

  const removeBlock = (id: string) => {
    onBlocksChange(blocks.filter((b) => b.id !== id));
    if (selectedBlockId === id) onSelectBlock(null);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[target]] = [newBlocks[target], newBlocks[index]];
    onBlocksChange(newBlocks);
  };

  const updateBlockProps = (id: string, key: string, value: unknown) => {
    onBlocksChange(
      blocks.map((b) => (b.id === id ? { ...b, props: { ...b.props, [key]: value } } : b)),
    );
  };

  const updateBlockType = (id: string, type: string) => {
    onBlocksChange(
      blocks.map((b) =>
        b.id === id
          ? { ...b, type, props: {} }
          : b,
      ),
    );
  };

  return (
    <div className="flex h-full gap-4">
      {/* Левая панель — Palette */}
      <div className="w-44 shrink-0">
        <Palette onAddBlock={addBlock} />
      </div>

      {/* Центр — Canvas */}
      <div className="min-w-0 flex-1">
        <StudioCanvas selectedId={selectedBlockId} onSelect={onSelectBlock}>
          {/* Page info bar */}
          <div className="flex items-center gap-3 border-b px-4 py-2">
            <input
              className="flex-1 rounded border px-2 py-1 text-sm font-medium"
              value={page.title}
              onChange={(e) => onPageChange({ title: e.target.value })}
              placeholder="Название страницы"
            />
            <input
              className="w-32 rounded border px-2 py-1 text-xs font-mono"
              value={page.route}
              onChange={(e) => onPageChange({ route: e.target.value })}
              placeholder="/route"
            />
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={page.inMenu}
                onChange={(e) => onPageChange({ inMenu: e.target.checked })}
              />
              В меню
            </label>
          </div>

          {/* Blocks */}
          <div className="space-y-0 p-4">
            {blocks.length === 0 && (
              <div className="flex items-center justify-center py-16 text-sm text-neutral-400">
                Перетащите блоки из палитры слева
              </div>
            )}
            {blocks.map((block, i) => (
              <CanvasBlock
                key={block.id}
                block={block}
                isSelected={selectedBlockId === block.id}
                onSelect={() => onSelectBlock(block.id)}
                onMoveUp={() => moveBlock(i, -1)}
                onMoveDown={() => moveBlock(i, 1)}
                canMoveUp={i > 0}
                canMoveDown={i < blocks.length - 1}
                onDelete={() => removeBlock(block.id)}
              />
            ))}
          </div>
        </StudioCanvas>
      </div>

      {/* Правая панель — Properties */}
      <div className="w-64 shrink-0 overflow-y-auto">
        {selectedBlock ? (
          <div className="space-y-2 rounded-lg border bg-white p-3">
            <BlockPropsEditor
              block={selectedBlock}
              onUpdateProps={(key, value) => updateBlockProps(selectedBlock.id, key, value)}
              onChangeType={(type) => updateBlockType(selectedBlock.id, type)}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-xs text-neutral-400">
            Выберите блок на странице
          </div>
        )}
      </div>
    </div>
  );
}
