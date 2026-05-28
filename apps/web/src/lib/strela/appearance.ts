export interface StrelaAppearance {
  primary_color?: string;
  accent_color?: string;
  funnel_page_background_color?: string;
  funnel_surface_color?: string;
  funnel_card_media_background_color?: string;
  funnel_font_heading?: string;
  funnel_font_body?: string;
  funnel_text_color?: string;
  funnel_text_muted_color?: string;
  funnel_panel_header_background_color?: string;
  funnel_panel_header_text_color?: string;
  funnel_button_background_color?: string;
  funnel_button_text_color?: string;
  funnel_button_secondary_background_color?: string;
  funnel_button_secondary_text_color?: string;
  funnel_table_row_alt_background_color?: string;
  funnel_table_row_selected_background_color?: string;
  sidebar_text?: string;
  funnel_sidebar_wordmark_url?: string;
  selection_card_caption_logo_url?: string;
  selection_flow_header_logo_url?: string;
  stage_headings?: Partial<Record<"category" | "hm_line" | "pu_line" | "pu_subtype", string>>;
  selection_stage_titles?: {
    category?: string;
    hm_line?: string;
    pu_line?: string;
    pu_subtype?: { title?: string; subtitle?: string };
  };
  selection_category_full_width?: boolean;
}

const FONT_MAP: Record<string, string> = {
  open_sans: '"Open Sans", system-ui, sans-serif',
  segoe: '"Segoe UI", system-ui, sans-serif',
};

const FONT_SIDEBAR =
  '"SegoeUISelectionSidebar", "Segoe UI", system-ui, sans-serif';

function pickColor(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

function pickFont(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return FONT_MAP[value] ?? FONT_MAP.open_sans;
}

/** Mirrors reference `wae()` — sets funnel CSS variables on :root */
export function applyStrelaAppearance(appearance: StrelaAppearance | undefined): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const a = appearance ?? {};

  const primary = pickColor(a.primary_color, "#13347f");
  const surface = pickColor(a.funnel_surface_color, "#ffffff");

  root.style.setProperty("--funnel-primary", primary);
  root.style.setProperty("--funnel-panel-border", "#d4d4d8");
  root.style.setProperty("--funnel-input-border", "#d4d4d8");
  root.style.setProperty("--funnel-accent", pickColor(a.accent_color, "#0ea5e9"));
  root.style.setProperty("--funnel-page-bg", pickColor(a.funnel_page_background_color, "#ffffff"));
  root.style.setProperty("--funnel-surface", surface);
  root.style.setProperty(
    "--funnel-card-media-bg",
    pickColor(a.funnel_card_media_background_color, "#eff0f9"),
  );
  const headingFont = pickFont(a.funnel_font_heading, FONT_SIDEBAR);
  root.style.setProperty("--funnel-font-heading", headingFont);
  root.style.setProperty("--funnel-font-sidebar", FONT_SIDEBAR);
  root.style.setProperty("--funnel-font-body", pickFont(a.funnel_font_body, FONT_MAP.segoe));
  root.style.setProperty("--funnel-text", pickColor(a.funnel_text_color, "#18181b"));
  root.style.setProperty("--funnel-text-muted", pickColor(a.funnel_text_muted_color, "#71717a"));
  root.style.setProperty(
    "--funnel-panel-header-bg",
    pickColor(a.funnel_panel_header_background_color, "#f4f4f5"),
  );
  root.style.setProperty(
    "--funnel-panel-header-text",
    pickColor(a.funnel_panel_header_text_color, "#52525b"),
  );
  root.style.setProperty(
    "--funnel-button-bg",
    pickColor(a.funnel_button_background_color, "#13347f"),
  );
  root.style.setProperty("--funnel-button-text", pickColor(a.funnel_button_text_color, "#ffffff"));
  root.style.setProperty(
    "--funnel-button-secondary-bg",
    pickColor(a.funnel_button_secondary_background_color, "#ffffff"),
  );
  root.style.setProperty(
    "--funnel-button-secondary-text",
    pickColor(a.funnel_button_secondary_text_color, "#18181b"),
  );
  root.style.setProperty(
    "--funnel-table-row-alt-bg",
    pickColor(a.funnel_table_row_alt_background_color, "#fafafa"),
  );
  root.style.setProperty(
    "--funnel-table-row-selected-bg",
    pickColor(a.funnel_table_row_selected_background_color, "#e8eef7"),
  );
  root.style.setProperty("--funnel-input-bg", pickColor(a.funnel_surface_color, "#ffffff"));
}

export function stageBackdropUrl(stage: number): string {
  const n = stage <= 3 ? String(stage).padStart(3, "0") : "003";
  return `/selection-assets/podbor-${n}.png`;
}
