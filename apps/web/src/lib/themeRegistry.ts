const loaded = new Set<string>();

const loaders: Record<string, () => Promise<unknown>> = {
  "theme-strela": () => import("@pumpstation/theme-strela/tokens.css"),
  "theme-acme": () => import("@pumpstation/theme-acme/tokens.css"),
  "theme-nord": () => import("@pumpstation/theme-nord/tokens.css"),
  "theme-aqua": () => import("@pumpstation/theme-aqua/tokens.css"),
};

export async function loadTheme(themeId: string): Promise<void> {
  if (loaded.has(themeId)) return;
  const load = loaders[themeId];
  if (!load) {
    console.warn(`Unknown theme: ${themeId}, fallback theme-strela`);
    await loaders["theme-strela"]();
    loaded.add("theme-strela");
    return;
  }
  await load();
  loaded.add(themeId);
}
