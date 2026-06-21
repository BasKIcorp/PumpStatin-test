import type { PageConfig } from "@pumpstation/contracts";

/** Страницы, редактируемые во вкладке «Страницы» (grid / wizard editor). */
export function isStudioPagesEditorPage(page: PageConfig): boolean {
  const type = page.type ?? "page";
  return type === "page" || type === "auth" || type === "cabinet" || type === "wizard";
}

/** Все страницы в выпадающем списке (включая визард подбора). */
export function listPagesForSelector(pages: PageConfig[]): PageConfig[] {
  return pages.filter((p) => {
    const type = p.type ?? "page";
    return type === "page" || type === "auth" || type === "cabinet" || type === "wizard";
  });
}

export function filterStudioPages(pages: PageConfig[]): PageConfig[] {
  return pages.filter(isStudioPagesEditorPage);
}

export function pickDefaultStudioPageId(pages: PageConfig[]): string | null {
  const editable = filterStudioPages(pages);
  const home = editable.find((p) => p.id === "home");
  if (home) return home.id;
  const wizard = editable.find((p) => p.type === "wizard");
  if (wizard) return wizard.id;
  const login = editable.find((p) => p.type === "auth");
  if (login) return login.id;
  return editable[0]?.id ?? null;
}
