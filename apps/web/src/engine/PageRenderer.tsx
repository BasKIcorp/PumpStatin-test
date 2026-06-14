import type { SiteConfig, PageConfig } from "@pumpstation/contracts";
import { useProfile } from "@/providers/ProfileProvider";
import { SiteLayout } from "./SiteLayout";
import { BLOCK_REGISTRY } from "./BlockRegistry";

interface PageRendererProps {
  page: PageConfig;
  site: SiteConfig;
}

/**
 * PageRenderer — универсальный рендерер для CMS-страниц.
 * Принимает конфиг страницы и конфиг сайта, рендерит блоки
 * страницы внутри SiteLayout.
 *
 * Каждый блок выбирается из BLOCK_REGISTRY по типу.
 * Если тип не найден — показывает fallback.
 */
export function PageRenderer({ page, site }: PageRendererProps) {
  const profile = useProfile();

  return (
    <SiteLayout layout={site.layout} site={site} profile={profile}>
      <div className="page-content">
        {page.blocks?.map((block) => {
          const Component = BLOCK_REGISTRY[block.type];
          if (!Component) {
            return (
              <div key={block.id} className="p-4 text-center text-sm text-muted-foreground">
                Неизвестный блок: {block.type}
              </div>
            );
          }
          return <Component key={block.id} block={block} profile={profile as unknown as Record<string, unknown>} />;
        })}
      </div>
    </SiteLayout>
  );
}
