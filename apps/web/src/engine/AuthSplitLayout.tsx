import type { BlockConfig, PageConfig, SiteConfig } from "@pumpstation/contracts";
import { DEFAULT_GRID_COLS, ensurePageBlocksLayout } from "@pumpstation/contracts";
import type { ReactNode } from "react";
import { LOGIN_PAGE_BRAND_SRC } from "@/lib/strela/selectionAssets";
import { authBlockColumn, sortBlocksByGridY } from "@/lib/gridLayout";
import { AuthEditorColumn } from "./AuthEditorColumn";
import type { PageEditorOptions } from "./pageEditorTypes";

export { authBlockColumn };

export interface AuthSplitLayoutProps {
  page: PageConfig;
  blocks: BlockConfig[];
  site?: SiteConfig;
  renderBlock: (block: BlockConfig) => ReactNode;
  editor?: PageEditorOptions & {
    onColumnReorder?: (column: "left" | "right", orderedIds: string[]) => void;
  };
}

/** Auth layout: flex split (~67/33) by grid column. */
export function AuthSplitLayout({ page, blocks, renderBlock, editor }: AuthSplitLayoutProps) {
  const cols = page.grid?.cols ?? DEFAULT_GRID_COLS;
  const normalized = ensurePageBlocksLayout(blocks);
  const leftBlocks = normalized.filter((b) => authBlockColumn(b, cols) === "left").sort(sortBlocksByGridY);
  const rightBlocks = normalized.filter((b) => authBlockColumn(b, cols) === "right").sort(sortBlocksByGridY);
  const sortableEditor = editor?.onColumnReorder ? editor : undefined;

  return (
    <div
      className="flex min-h-[100dvh] w-full max-w-full overflow-x-hidden antialiased"
      style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }}
      data-page-id={page.id}
      data-page-profile={page.pageProfile ?? "auth-minimal"}
    >
      <div
        className="box-border h-[100dvh] min-h-0 min-w-0 shrink-0 grow-0 basis-[67.2%] overflow-hidden bg-white pl-0 pr-2 max-sm:hidden sm:pr-4"
        aria-hidden
      >
        <div className="flex h-full w-full min-h-0 min-w-0 flex-col">
          {leftBlocks.length > 0 ? (
            sortableEditor ? (
              <AuthEditorColumn
                page={page}
                blocks={normalized}
                column="left"
                renderBlock={renderBlock}
                editor={sortableEditor}
                onColumnReorder={sortableEditor.onColumnReorder!}
              />
            ) : (
              leftBlocks.map((block) => (
                <div key={block.id} className="min-h-0 min-w-0 flex-1 overflow-hidden">
                  {renderBlock(block)}
                </div>
              ))
            )
          ) : (
            <img
              src={LOGIN_PAGE_BRAND_SRC}
              alt=""
              className="h-full w-full min-h-0 object-contain object-left"
              decoding="async"
            />
          )}
        </div>
      </div>

      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col items-center justify-center bg-white px-4">
        <div className="mb-6 w-full max-w-[172px] sm:hidden">
          <img
            src={LOGIN_PAGE_BRAND_SRC}
            alt=""
            className="mx-auto h-32 w-full max-w-[200px] object-contain object-left"
            decoding="async"
          />
        </div>
        <div className="relative w-full pl-4" style={{ maxWidth: 172, padding: "0 8px 0 16px" }}>
          {sortableEditor && rightBlocks.length > 0 ? (
            <AuthEditorColumn
              page={page}
              blocks={normalized}
              column="right"
              renderBlock={renderBlock}
              editor={sortableEditor}
              onColumnReorder={sortableEditor.onColumnReorder!}
            />
          ) : (
            rightBlocks.map((block) => (
              <div key={block.id} className="w-full shrink-0">
                {renderBlock(block)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
