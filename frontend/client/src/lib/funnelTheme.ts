/**
 * CSS-переменные темы воронки подбора (страницы категории, этапы, «Работа»).
 * Значения приходят из GET /api/appearance и PATCH White-Label.
 */

export const FUNNEL_THEME_CSS_VARS = [
  "--funnel-primary",
  "--funnel-accent",
  "--funnel-page-bg",
  "--funnel-surface",
  "--funnel-card-media-bg",
  "--funnel-font-heading",
  "--funnel-font-body",
  "--funnel-text",
  "--funnel-text-muted",
  "--funnel-panel-header-bg",
  "--funnel-panel-header-text",
  "--funnel-button-bg",
  "--funnel-button-text",
  "--funnel-button-secondary-bg",
  "--funnel-button-secondary-text",
  "--funnel-table-row-alt-bg",
  "--funnel-table-row-selected-bg",
  "--funnel-input-bg",
  "--funnel-chart-bg",
] as const;

export type FunnelFontKey = "segoe" | "open_sans" | "system";

export type FunnelThemeAppearance = {
  primary_color?: string | null;
  accent_color?: string | null;
  funnel_page_background_color?: string | null;
  funnel_surface_color?: string | null;
  funnel_card_media_background_color?: string | null;
  funnel_font_heading?: string | null;
  funnel_font_body?: string | null;
  funnel_text_color?: string | null;
  funnel_text_muted_color?: string | null;
  funnel_panel_header_background_color?: string | null;
  funnel_panel_header_text_color?: string | null;
  funnel_button_background_color?: string | null;
  funnel_button_text_color?: string | null;
  funnel_button_secondary_background_color?: string | null;
  funnel_button_secondary_text_color?: string | null;
  funnel_table_row_alt_background_color?: string | null;
  funnel_table_row_selected_background_color?: string | null;
};

const DEFAULTS = {
  primary: "#13347f",
  accent: "#0ea5e9",
  pageBg: "#ffffff",
  surface: "#ffffff",
  cardMediaBg: "#eff0f9",
  fontHeading: "segoe" as FunnelFontKey,
  fontBody: "open_sans" as FunnelFontKey,
  text: "#18181b",
  textMuted: "#71717a",
  panelHeaderBg: "#f4f4f5",
  panelHeaderText: "#52525b",
  buttonText: "#ffffff",
  tableRowAlt: "#f4f4f5",
  tableRowSelected: "#dbeafe",
};

const FONT_STACKS: Record<FunnelFontKey, string> = {
  segoe: '"Segoe UI", "SegoeUISelectionSidebar", system-ui, sans-serif',
  open_sans: '"Open Sans", system-ui, sans-serif',
  system: "system-ui, -apple-system, sans-serif",
};

export function hexToHsl(hex: string): string | null {
  const expanded = hex.replace(
    /^#?([a-f\d])([a-f\d])([a-f\d])$/i,
    (_, r, g, b) => r + r + g + g + b + b,
  );
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(expanded);
  if (!m) return null;
  let r = parseInt(m[1], 16) / 255;
  let g = parseInt(m[2], 16) / 255;
  let b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function normalizeHex(hex: string | null | undefined, fallback: string): string {
  if (!hex?.trim()) return fallback;
  let v = hex.trim();
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  return fallback;
}

/** Пустая строка в PATCH — сброс на вычисляемое значение (primary / surface / text). */
function normalizeHexOptional(hex: string | null | undefined, computed: string): string {
  if (hex === null || hex === undefined) return computed;
  if (hex.trim() === "") return computed;
  return normalizeHex(hex, computed);
}

function normalizeFontKey(key: string | null | undefined, fallback: FunnelFontKey): FunnelFontKey {
  const k = (key || "").trim().toLowerCase();
  if (k === "segoe" || k === "open_sans" || k === "system") return k;
  return fallback;
}

/** Применяет тему воронки и Tailwind --primary/--accent на :root. */
export function applyFunnelTheme(data: FunnelThemeAppearance | null | undefined): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  const primary = normalizeHex(data?.primary_color, DEFAULTS.primary);
  const accent = normalizeHex(data?.accent_color, DEFAULTS.accent);
  const pageBg = normalizeHex(data?.funnel_page_background_color, DEFAULTS.pageBg);
  const surface = normalizeHex(data?.funnel_surface_color, DEFAULTS.surface);
  const cardMediaBg = normalizeHex(data?.funnel_card_media_background_color, DEFAULTS.cardMediaBg);
  const fontHeading = normalizeFontKey(data?.funnel_font_heading, DEFAULTS.fontHeading);
  const fontBody = normalizeFontKey(data?.funnel_font_body, DEFAULTS.fontBody);

  const text = normalizeHex(data?.funnel_text_color, DEFAULTS.text);
  const textMuted = normalizeHex(data?.funnel_text_muted_color, DEFAULTS.textMuted);
  const panelHeaderBg = normalizeHex(data?.funnel_panel_header_background_color, DEFAULTS.panelHeaderBg);
  const panelHeaderText = normalizeHex(data?.funnel_panel_header_text_color, DEFAULTS.panelHeaderText);
  const buttonBg = normalizeHexOptional(data?.funnel_button_background_color, primary);
  const buttonText = normalizeHex(data?.funnel_button_text_color, DEFAULTS.buttonText);
  const buttonSecondaryBg = normalizeHexOptional(data?.funnel_button_secondary_background_color, surface);
  const buttonSecondaryText = normalizeHexOptional(data?.funnel_button_secondary_text_color, text);
  const tableRowAlt = normalizeHex(data?.funnel_table_row_alt_background_color, DEFAULTS.tableRowAlt);
  const tableRowSelected = normalizeHex(
    data?.funnel_table_row_selected_background_color,
    DEFAULTS.tableRowSelected,
  );

  root.style.setProperty("--funnel-primary", primary);
  root.style.setProperty("--funnel-accent", accent);
  root.style.setProperty("--funnel-page-bg", pageBg);
  root.style.setProperty("--funnel-surface", surface);
  root.style.setProperty("--funnel-card-media-bg", cardMediaBg);
  root.style.setProperty("--funnel-font-heading", FONT_STACKS[fontHeading]);
  root.style.setProperty("--funnel-font-body", FONT_STACKS[fontBody]);
  root.style.setProperty("--funnel-text", text);
  root.style.setProperty("--funnel-text-muted", textMuted);
  root.style.setProperty("--funnel-panel-header-bg", panelHeaderBg);
  root.style.setProperty("--funnel-panel-header-text", panelHeaderText);
  root.style.setProperty("--funnel-button-bg", buttonBg);
  root.style.setProperty("--funnel-button-text", buttonText);
  root.style.setProperty("--funnel-button-secondary-bg", buttonSecondaryBg);
  root.style.setProperty("--funnel-button-secondary-text", buttonSecondaryText);
  root.style.setProperty("--funnel-table-row-alt-bg", tableRowAlt);
  root.style.setProperty("--funnel-table-row-selected-bg", tableRowSelected);
  root.style.setProperty("--funnel-input-bg", surface);
  root.style.setProperty("--funnel-chart-bg", surface);

  const textHsl = hexToHsl(text);
  const surfaceHsl = hexToHsl(surface);
  if (surfaceHsl) {
    root.style.setProperty("--popover", surfaceHsl);
    root.style.setProperty("--card", surfaceHsl);
  }
  if (textHsl) {
    root.style.setProperty("--popover-foreground", textHsl);
    root.style.setProperty("--card-foreground", textHsl);
  }

  const primaryHsl = hexToHsl(primary);
  if (primaryHsl) {
    root.style.setProperty("--primary", primaryHsl);
    root.style.setProperty("--ring", primaryHsl);
  }
  const accentHsl = hexToHsl(accent);
  if (accentHsl) {
    root.style.setProperty("--accent", accentHsl);
  }
}
