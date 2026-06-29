import type { BlockConfig, PageConfig, SiteConfig } from "@pumpstation/contracts";
import { getBlockComponent } from "@/engine/BlockRegistry";
import { blockProfileProps } from "@/engine/blockProfile";
import { GridPageContent } from "@/engine/GridPageContent";
import type { PageEditorOptions } from "@/engine/pageEditorTypes";
import { useProfile } from "@/providers/ProfileProvider";
import { FIGMA } from "@/routes/admin/studio/figma/figmaTokens";
import {
  WIZARD_SELECTION_CURVES,
  WIZARD_SELECTION_OPTIONS,
  WIZARD_SELECTION_PARAMS,
  WIZARD_SELECTION_RESULTS,
  WIZARD_SELECTION_TECH_SPECS,
  WIZARD_SELECTION_WORK_HEADER,
} from "@/routes/admin/studio/wizard/wizardFrameUtils";

const STACK_PANEL_TYPES = [
  WIZARD_SELECTION_PARAMS,
  WIZARD_SELECTION_CURVES,
  WIZARD_SELECTION_TECH_SPECS,
  WIZARD_SELECTION_OPTIONS,
  WIZARD_SELECTION_RESULTS,
] as const;

const MOBILE_PANEL_MIN_H: Partial<Record<string, string>> = {
  [WIZARD_SELECTION_CURVES]: "min-h-[280px]",
  [WIZARD_SELECTION_TECH_SPECS]: "min-h-[200px]",
};

function blockByType(blocks: BlockConfig[], type: string) {
  return blocks.find((b) => b.type === type);
}

function StackedSelectionBlock({
  block,
  site,
  editor,
}: {
  block: BlockConfig;
  site?: SiteConfig;
  editor?: PageEditorOptions;
}) {
  const profile = useProfile();
  const Component = getBlockComponent(block.type);
  if (!Component) return null;
  const selected = editor?.selectedId === block.id;

  return (
    <div
      data-block-type={block.type}
      className={`shrink-0 rounded ${MOBILE_PANEL_MIN_H[block.type] ?? ""} ${editor ? "cursor-pointer" : ""}`}
      style={selected ? { boxShadow: `inset 0 0 0 2px ${FIGMA.accent}` } : undefined}
      onClick={
        editor
          ? (e) => {
              e.stopPropagation();
              editor.onSelect(block.id);
            }
          : undefined
      }
    >
      <Component
        block={block}
        profile={blockProfileProps(profile, { site, profileId: editor?.profileId })}
      />
    </div>
  );
}

/**
 * Live Strela selection-form: mobile vertical stack (lg:hidden) + desktop grid (lg+).
 * Studio narrow viewport: stack preview with layer selection.
 */
export function SelectionFormDecomposedLayout({
  page,
  blocks,
  site,
  editor,
  stackPanels = false,
}: {
  page: PageConfig;
  blocks: BlockConfig[];
  site?: SiteConfig;
  editor?: PageEditorOptions;
  stackPanels?: boolean;
}) {
  const stepPage: PageConfig = { ...page, type: "wizard", blocks };

  if (editor && !stackPanels) {
    return <GridPageContent page={stepPage} blocks={blocks} site={site} editor={editor} />;
  }

  const headerBlock = blockByType(blocks, WIZARD_SELECTION_WORK_HEADER);
  const stackOnly = Boolean(editor && stackPanels);

  return (
    <div
      className="selection-work-root flex h-full min-h-0 w-full flex-col overflow-hidden"
      style={{ fontFamily: "var(--funnel-font-body)" }}
    >
      {headerBlock ? (
        <div className="shrink-0">
          <StackedSelectionBlock block={headerBlock} site={site} editor={editor} />
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2 sm:px-4 lg:px-6">
        <div
          className={`flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto ${stackOnly ? "" : "lg:hidden"}`}
          data-testid="selection-form-stack"
        >
          {STACK_PANEL_TYPES.map((type) => {
            const block = blockByType(blocks, type);
            if (!block) return null;
            return (
              <StackedSelectionBlock key={block.id} block={block} site={site} editor={editor} />
            );
          })}
        </div>

        {!stackOnly ? (
          <div className="hidden min-h-0 flex-1 flex-col lg:flex">
            <GridPageContent page={stepPage} blocks={blocks} site={site} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
