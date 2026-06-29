import type { PageConfig } from "@pumpstation/contracts";
import { normalizeWizardPage } from "@/routes/admin/studio/wizard/wizardUnifiedBlocks";

/** Stable JSON for dirty-state comparison */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}

export function siteConfigFingerprint(site: {
  layout: unknown;
  pages: unknown;
  routing?: unknown;
}): string {
  return stableStringify(site);
}

export function wizardNavFingerprint(nav: {
  steps: unknown;
  cards: unknown;
  flows?: unknown;
}): string {
  return stableStringify({
    steps: nav.steps,
    cards: nav.cards,
    flows: nav.flows ?? {},
  });
}

/** Wizard page layout: unified blocks (Option C) or legacy frames. */
export function wizardPageLayoutFingerprint(page: PageConfig | undefined): string {
  if (!page) return "";
  if (page.type === "wizard") {
    const normalized = normalizeWizardPage(page);
    return stableStringify({
      id: normalized.id,
      blocks: normalized.blocks ?? [],
      route: normalized.route,
      title: normalized.title,
      inMenu: normalized.inMenu,
    });
  }
  return stableStringify({ id: page.id, frames: page.frames ?? {} });
}

/** @deprecated use wizardPageLayoutFingerprint */
export function wizardPageFramesFingerprint(page: PageConfig | undefined): string {
  return wizardPageLayoutFingerprint(page);
}

export function wizardAppearanceFingerprint(appearance: unknown): string {
  return stableStringify(appearance ?? {});
}

/** Single dirty fingerprint for wizard bundle (nav + layout + appearance) */
export function wizardBundleFingerprint(
  nav: { steps: unknown; cards: unknown; flows?: unknown },
  page: PageConfig | undefined,
  appearance: unknown,
): string {
  const layoutPage = page?.type === "wizard" ? normalizeWizardPage(page) : page;
  return stableStringify({
    nav: {
      steps: nav.steps,
      cards: nav.cards,
      flows: nav.flows ?? {},
    },
    page: layoutPage
      ? page?.type === "wizard"
        ? {
            id: layoutPage.id,
            blocks: layoutPage.blocks ?? [],
            route: layoutPage.route,
            title: layoutPage.title,
            inMenu: layoutPage.inMenu,
          }
        : {
            id: layoutPage.id,
            frames: layoutPage.frames ?? {},
            route: layoutPage.route,
            title: layoutPage.title,
            inMenu: layoutPage.inMenu,
          }
      : null,
    appearance: appearance ?? {},
  });
}

export function pdfTemplateFingerprint(data: {
  templateName: string;
  mode: string;
  blocks?: unknown[];
  pages?: unknown[];
  pageDefaults?: unknown;
}): string {
  return stableStringify({
    templateName: data.templateName,
    mode: data.mode,
    pageDefaults: data.pageDefaults,
    pages: data.pages,
    blocks: data.blocks,
  });
}
