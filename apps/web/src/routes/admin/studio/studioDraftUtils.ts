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

export function wizardPageFramesFingerprint(page: { id: string; frames?: unknown } | undefined): string {
  if (!page) return "";
  return stableStringify({ id: page.id, frames: page.frames ?? {} });
}
