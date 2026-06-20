import type { PageConfig, SiteConfig } from "@pumpstation/contracts";
import { WizardGridPage } from "./WizardGridPage";
import { PageContentRouter } from "./PageContentRouter";

interface SitePageProps {
  page: PageConfig;
  site: SiteConfig;
  /** Studio preview: фиксированный шаг визарда вместо wizardStore */
  previewWizardStepId?: string;
}

/** Live / draft preview entry from site.yaml */
export function SitePage({ page, site, previewWizardStepId }: SitePageProps) {
  const blocks = page.blocks ?? [];

  if (page.type === "wizard") {
    return (
      <WizardGridPage page={page} site={site} previewStepId={previewWizardStepId} />
    );
  }

  return <PageContentRouter page={page} blocks={blocks} site={site} />;
}
