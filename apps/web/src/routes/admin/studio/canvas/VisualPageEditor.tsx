import type { BlockConfig, PageConfig } from "@pumpstation/contracts";
import { Palette } from "@/routes/admin/studio/palette/Palette";
import { StudioCanvas } from "./StudioCanvas";
import { CanvasBlock } from "./CanvasBlock";
import { PropertiesPanel } from "@/routes/admin/studio/properties/PropertiesPanel";
import { getSchema } from "@/routes/admin/studio/properties/blockSchema";

/* helpers */
function resolveValue(props: Record<string, unknown>, key: string): unknown {
  const parts = key.split(".");
  let val: unknown = props;
  for (const p of parts) {
    if (val === null || val === undefined) return undefined;
    val = (val as Record<string, unknown>)[p];
  }
  return val;
}

function setValue(
  props: Record<string, unknown>,
  key: string,
  value: unknown,
): Record<string, unknown> {
  const parts = key.split(".");
  if (parts.length === 1) return { ...props, [key]: value };
  const [first, ...rest] = parts;
  const inner = resolveValue(props, first) as Record<string, unknown> ?? {};
  return { ...props, [first]: setValue(inner, rest.join("."), value) };
}

/** Дефолтные props для типа блока */
function defaultProps(type: string): Record<string, unknown> {
  const schema = getSchema(type);
  if (!schema) return {};
  const result: Record<string, unknown> = {};
  for (const field of schema.fields) {
    if (field.defaultValue !== undefined) {
      const parts = field.key.split(".");
      if (parts.length === 1) {
        result[field.key] = field.defaultValue;
      } else {
        setValue(result, field.key, field.defaultValue);
      }
    }
  }
  return result;
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
}) {
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null;

  const addBlock = (type: string) => {
    const id = `block-${Date.now()}`;
    const newBlocks = [...blocks, { id, type, props: defaultProps(type) }];
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

  const updateBlockType = (id: string, type: string) => {
    onBlocksChange(
      blocks.map((b) => (b.id === id ? { ...b, type, props: defaultProps(type) } : b)),
    );
  };

  const updateBlockProps = (id: string, key: string, value: unknown) => {
    onBlocksChange(
      blocks.map((b) => {
        if (b.id !== id) return b;
        return { ...b, props: setValue(b.props, key, value) };
      }),
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
        <StudioCanvas
          selectedId={selectedBlockId}
          onSelect={onSelectBlock}
          onDropBlock={addBlock}
        >
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
                Выберите блок слева, чтобы добавить
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
      <div className="w-64 shrink-0 overflow-y-auto rounded-lg border bg-white p-3">
        {selectedBlock ? (
          <PropertiesPanel
            block={selectedBlock}
            onChangeType={(type) => updateBlockType(selectedBlock.id, type)}
            onChangeProp={(key, value) => updateBlockProps(selectedBlock.id, key, value)}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-xs text-neutral-400">
            Выберите блок на странице
          </div>
        )}
      </div>
    </div>
  );
}
