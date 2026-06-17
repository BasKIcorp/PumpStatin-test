import { useEffect } from "react";
import type { BlockConfig, PageConfig } from "@pumpstation/contracts";
import { Palette } from "@/routes/admin/studio/palette/Palette";
import { LayersPanel } from "@/routes/admin/studio/palette/LayersPanel";
import { StudioCanvas } from "./StudioCanvas";
import { CanvasBlock } from "./CanvasBlock";
import { PropertiesPanel } from "@/routes/admin/studio/properties/PropertiesPanel";
import { PagePropertiesPanel } from "@/routes/admin/studio/properties/PagePropertiesPanel";
import { getSchema } from "@/routes/admin/studio/properties/blockSchema";
import { LivePreview } from "@/routes/admin/studio/preview/LivePreview";
import { setNested } from "./studioPropUtils";
import { StudioLeftSidebar } from "@/routes/admin/studio/figma/StudioLeftSidebar";
import { StudioRightSidebar } from "@/routes/admin/studio/figma/StudioRightSidebar";
import { FIGMA } from "@/routes/admin/studio/figma/figmaTokens";

function defaultProps(type: string): Record<string, unknown> {
  const schema = getSchema(type);
  if (!schema) return {};
  let result: Record<string, unknown> = {};
  for (const field of schema.fields) {
    if (field.defaultValue !== undefined) {
      result = setNested(result, field.key, field.defaultValue);
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
  profileId,
  previewMode = false,
  onPreviewClose,
}: {
  blocks: BlockConfig[];
  page: PageConfig;
  onPageChange: (patch: Partial<PageConfig>) => void;
  onBlocksChange: (blocks: BlockConfig[]) => void;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  profileId?: string;
  previewMode?: boolean;
  onPreviewClose?: () => void;
}) {
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null;

  const addBlock = (type: string) => {
    const id = `block-${Date.now()}`;
    onBlocksChange([...blocks, { id, type, props: defaultProps(type) }]);
    onSelectBlock(id);
  };

  const removeBlock = (id: string) => {
    onBlocksChange(blocks.filter((b) => b.id !== id));
    if (selectedBlockId === id) onSelectBlock(null);
  };

  const reorderBlock = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= blocks.length || to >= blocks.length) return;
    const nb = [...blocks];
    const [item] = nb.splice(from, 1);
    nb.splice(to, 0, item);
    onBlocksChange(nb);
  };

  const updateBlockType = (id: string, type: string) => {
    onBlocksChange(blocks.map((b) => (b.id === id ? { ...b, type, props: defaultProps(type) } : b)));
  };

  const updateProp = (id: string, key: string, value: unknown) => {
    onBlocksChange(
      blocks.map((b) =>
        b.id !== id ? b : { ...b, props: setNested(b.props ?? {}, key, value) },
      ),
    );
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === "Escape") onSelectBlock(null);
      if ((e.key === "Delete" || e.key === "Backspace") && selectedBlockId) {
        e.preventDefault();
        onBlocksChange(blocks.filter((b) => b.id !== selectedBlockId));
        onSelectBlock(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedBlockId, blocks, onBlocksChange, onSelectBlock]);

  if (previewMode) {
    return (
      <div className="h-full min-h-0 flex-1">
        <LivePreview profileId={profileId ?? ""} onClose={() => onPreviewClose?.()} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      <StudioLeftSidebar
        layers={
          <LayersPanel
            blocks={blocks}
            selectedId={selectedBlockId}
            onSelect={onSelectBlock}
            onReorder={reorderBlock}
            onDelete={removeBlock}
          />
        }
        assets={<Palette onAddBlock={addBlock} />}
      />

      <StudioCanvas
        artboardLabel={page.title}
        onSelect={onSelectBlock}
        onDropBlock={addBlock}
      >
        {blocks.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-2 py-32 text-sm"
            style={{ color: FIGMA.textDim }}
          >
            <span>Перетащите блок из панели «Блоки»</span>
            <span className="text-xs">или кликните по типу в списке</span>
          </div>
        ) : (
          blocks.map((block) => (
            <CanvasBlock
              key={block.id}
              block={block}
              isSelected={selectedBlockId === block.id}
              onSelect={() => onSelectBlock(block.id)}
            />
          ))
        )}
      </StudioCanvas>

      <StudioRightSidebar>
        {selectedBlock ? (
          <PropertiesPanel
            block={selectedBlock}
            onChangeType={(type) => updateBlockType(selectedBlock.id, type)}
            onChangeProp={(key, value) => updateProp(selectedBlock.id, key, value)}
          />
        ) : (
          <PagePropertiesPanel page={page} onChange={onPageChange} />
        )}
      </StudioRightSidebar>
    </div>
  );
}
