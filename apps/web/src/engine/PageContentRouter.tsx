import { useCallback } from "react";
import type { BlockConfig, BlockGridLayout, PageConfig, SiteConfig } from "@pumpstation/contracts";
import { DEFAULT_GRID_COLS } from "@pumpstation/contracts";
import { useProfile } from "@/providers/ProfileProvider";
import { AppShell } from "@/components/layout/AppShell";
import { SiteLayout } from "@/engine/SiteLayout";
import { GridPageContent } from "@/engine/GridPageContent";
import { AuthPageContent } from "@/engine/AuthPageContent";
import { AuthLoginProvider } from "@/blocks/auth/AuthLoginProvider";
import type { PageEditorOptions } from "@/engine/pageEditorTypes";
import { clampLayout, canPlaceLayout, pageGridMetrics, reorderAuthColumnByIds } from "@/lib/gridLayout";

export interface PageContentRouterProps {
  page: PageConfig;
  blocks: BlockConfig[];
  site: SiteConfig;
  /** Studio: выбор блоков и drag/resize по CSS grid */
  editor?: PageEditorOptions & {
    onBlocksChange?: (blocks: BlockConfig[] | ((prev: BlockConfig[]) => BlockConfig[])) => void;
  };
}

/**
 * Единая разметка страницы для live, preview и studio.
 * Wizard — отдельный поток (WizardGridPage / WizardUnifiedStudioEditor).
 */
export function PageContentRouter({ page, blocks, site, editor }: PageContentRouterProps) {
  const profile = useProfile();
  const { cols } = pageGridMetrics(page);

  const onLayoutChange = useCallback(
    (id: string, layout: BlockGridLayout) => {
      if (!editor?.onBlocksChange) return;
      editor.onBlocksChange((prev) => {
        const next = clampLayout(layout, cols);
        if (!canPlaceLayout(next, prev, id, cols)) return prev;
        return prev.map((b) => (b.id === id ? { ...b, layout: next } : b));
      });
    },
    [cols, editor],
  );

  const editorOpts: PageEditorOptions | undefined = editor
    ? {
        selectedId: editor.selectedId,
        onSelect: editor.onSelect,
        onLayoutChange: editor.onBlocksChange ? onLayoutChange : undefined,
        profileId: editor.profileId,
        blocks,
      }
    : undefined;

  if (page.type === "auth") {
    const authCols = page.grid?.cols ?? DEFAULT_GRID_COLS;
    const authEditor = editor
      ? {
          selectedId: editor.selectedId,
          onSelect: editor.onSelect,
          profileId: editor.profileId,
          blocks,
          onColumnReorder: editor.onBlocksChange
            ? (column: "left" | "right", orderedIds: string[]) => {
                editor.onBlocksChange!((prev) =>
                  reorderAuthColumnByIds(prev, column, orderedIds, authCols),
                );
              }
            : undefined,
        }
      : undefined;
    const authContent = (
      <AuthPageContent page={page} blocks={blocks} site={site} editor={authEditor} />
    );
    if (editor) return authContent;
    return <AuthLoginProvider>{authContent}</AuthLoginProvider>;
  }

  const grid = <GridPageContent page={page} blocks={blocks} site={site} editor={editorOpts} />;

  if (page.type === "cabinet") {
    return (
      <div
        className={editor ? "relative h-full w-full min-h-[500px]" : undefined}
        data-page-id={page.id}
        data-page-profile={page.pageProfile ?? ""}
      >
        <AppShell>{grid}</AppShell>
      </div>
    );
  }

  const cms = editor ? (
    <div className="relative h-full w-full min-h-[400px]">{grid}</div>
  ) : (
    grid
  );

  return (
    <SiteLayout layout={site.layout} site={site} profile={profile}>
      {cms}
    </SiteLayout>
  );
}
