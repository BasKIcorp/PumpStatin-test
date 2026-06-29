import { useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { BlockConfig, PageConfig, SiteConfig } from "@pumpstation/contracts";
import { useProfile } from "@/providers/ProfileProvider";
import { getBlockComponent } from "@/engine/BlockRegistry";
import { blockProfileProps } from "@/engine/blockProfile";
import type { PageEditorOptions } from "@/engine/pageEditorTypes";
import { AuthSplitLayout } from "./AuthSplitLayout";
import { FIGMA } from "@/routes/admin/studio/figma/figmaTokens";
import { STUDIO_CANVAS_DROP_ZONE_ID } from "@/routes/admin/studio/canvas/studioCanvasContext";

interface AuthPageContentProps {
  page: PageConfig;
  blocks: BlockConfig[];
  site?: SiteConfig;
  editor?: PageEditorOptions & {
    onColumnReorder?: (column: "left" | "right", orderedIds: string[]) => void;
  };
}

function renderAuthBlock(
  block: BlockConfig,
  profile: ReturnType<typeof useProfile>,
  site?: SiteConfig,
  profileId?: string,
) {
  const Component = getBlockComponent(block.type);
  if (!Component) {
    return (
      <div
        data-block-id={block.id}
        data-block-type={block.type}
        className="rounded border border-dashed p-4 text-sm text-muted-foreground"
      >
        Неизвестный блок: {block.type}
      </div>
    );
  }
  const layout = block.layout ?? { x: 0, y: 0, w: 12, h: 4 };
  return (
    <div
      data-block-id={block.id}
      data-block-type={block.type}
      data-grid-x={layout.x}
      data-grid-y={layout.y}
      data-grid-w={layout.w}
      data-grid-h={layout.h}
      data-testid={`block-${block.id}`}
    >
      <Component
        block={block}
        profile={blockProfileProps(profile, { site, profileId })}
      />
    </div>
  );
}

export function AuthPageContent({ page, blocks, site, editor }: AuthPageContentProps) {
  const profile = useProfile();
  const sortable = Boolean(editor?.onColumnReorder);

  const { setNodeRef, isOver: isDropOver } = useDroppable({
    id: STUDIO_CANVAS_DROP_ZONE_ID,
    disabled: !editor,
  });

  const canvasRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
    },
    [setNodeRef],
  );

  return (
    <div
      ref={canvasRef}
      id={editor ? STUDIO_CANVAS_DROP_ZONE_ID : undefined}
      data-testid={editor ? "grid-canvas" : "login-page"}
      data-page-id={page.id}
      className={editor ? "relative h-full min-h-[900px] w-full" : undefined}
      style={
        editor && isDropOver
          ? { outline: `2px dashed ${FIGMA.accent}`, outlineOffset: -4 }
          : undefined
      }
      onMouseDown={
        editor
          ? (e) => {
              if (e.target === e.currentTarget) editor.onSelect(null);
            }
          : undefined
      }
    >
      <AuthSplitLayout
        page={page}
        blocks={blocks}
        site={site}
        editor={editor}
        renderBlock={(block) => {
          const content = renderAuthBlock(block, profile, site, editor?.profileId);
          if (sortable || !editor) return content;

          const selected = editor.selectedId === block.id;
          return (
            <div
              className="relative h-full w-full"
              style={{
                boxShadow: selected
                  ? `inset 0 0 0 2px ${FIGMA.accent}`
                  : "inset 0 0 0 1px transparent",
                cursor: "pointer",
              }}
              onClick={(e) => {
                e.stopPropagation();
                editor.onSelect(block.id);
              }}
            >
              {content}
            </div>
          );
        }}
      />
    </div>
  );
}
