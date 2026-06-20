import type { BlockConfig, PageConfig, SiteConfig } from "@pumpstation/contracts";
import { PageContentRouter } from "@/engine/PageContentRouter";

/** Studio canvas — тот же PageContentRouter, что live/preview, с editor */
export function StudioPageCanvas({
  page,
  blocks,
  site,
  selectedId,
  onSelect,
  onBlocksChange,
  profileId,
}: {
  page: PageConfig;
  blocks: BlockConfig[];
  site: SiteConfig;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onBlocksChange: (blocks: BlockConfig[] | ((prev: BlockConfig[]) => BlockConfig[])) => void;
  profileId?: string;
}) {
  return (
    <PageContentRouter
      page={page}
      blocks={blocks}
      site={site}
      editor={{
        selectedId,
        onSelect,
        onBlocksChange,
        profileId,
      }}
    />
  );
}
