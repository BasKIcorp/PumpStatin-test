/** Конфигурация сайта — все страницы, layout, навигация */

export interface SiteRoutingConfig {
  /** pageId для редиректа с `/` */
  landingPageId?: string;
}

export interface SiteConfig {
  layout: LayoutConfig;
  pages: PageConfig[];
  routing?: SiteRoutingConfig;
}

export interface LayoutConfig {
  header: HeaderConfig;
  footer: FooterConfig;
}

export interface HeaderConfig {
  logo: {
    src: string;
    width: number;
    link: string;
  };
  menu: MenuItem[];
  loginButton: boolean;
}

export interface MenuItem {
  label: string;
  pageId: string;
}

export interface FooterConfig {
  columns: FooterColumn[];
  copyright: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface FooterLink {
  label: string;
  pageId: string;
}

export type PageType = "page" | "wizard" | "auth" | "cabinet";

export interface PageGridConfig {
  cols?: number;
  rowHeight?: number;
}

export interface BlockCropInset {
  /** Доля от размера ячейки, 0–100 */
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BlockGridLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Градусы, по умолчанию 0 */
  rotation?: number;
  /** Inset-обрезка в локальных координатах блока; null/undefined = без обрезки */
  crop?: BlockCropInset | null;
}

export interface BlockBindings {
  readFrom?: "formValues" | "matchedPumps" | "stationResult" | "selectionId" | "wizardContext";
  readPath?: string;
  action?: "match-pumps" | "build-station" | "generate-pdf";
  fieldId?: string;
  sectionId?: string;
  chartPreset?: string;
  columns?: string[];
}

export interface BlockConfig {
  id: string;
  type: string;
  props: Record<string, unknown>;
  layout?: BlockGridLayout;
  bindings?: BlockBindings;
}

export interface WizardFrameConfig {
  blocks: BlockConfig[];
}

export interface PageConfig {
  id: string;
  title: string;
  route: string;
  inMenu: boolean;
  type?: PageType;
  pageProfile?: string;
  grid?: PageGridConfig;
  blocks?: BlockConfig[];
  frames?: Record<string, WizardFrameConfig>;
  wizardRef?: string;
}

/** Props, которые получает каждый компонент-блок */
export interface BlockProps {
  block: BlockConfig;
  profile: Record<string, unknown>;
}

/** Регистр блоков: тип → компонент */
export type BlockRegistry = Record<string, React.ComponentType<BlockProps>>;

export const DEFAULT_GRID_COLS = 12;
export const DEFAULT_ROW_HEIGHT = 40;

const TYPE_HEIGHT: Record<string, number> = {
  hero: 8,
  divider: 1,
  "rich-text": 4,
  "card-grid": 6,
  "product-grid": 8,
  "contact-form": 8,
  map: 6,
  "auth/brand-panel": 16,
  "auth/login-form": 10,
  "auth/quick-login": 4,
  "wizard/step-heading": 2,
  "wizard/funnel-sidebar": 22,
  "wizard/funnel-heading": 2,
  "wizard/selection-card": 12,
  "wizard/selection-work-header": 2,
  "wizard/selection-params-panel": 9,
  "wizard/selection-curves-panel": 9,
  "wizard/selection-tech-specs-panel": 9,
  "wizard/selection-options-panel": 9,
  "wizard/selection-results-panel": 9,
  "wizard/card-grid-strela": 10,
  "wizard/legacy-selection": 20,
};

export function defaultBlockLayout(type: string, index: number): BlockGridLayout {
  const h = TYPE_HEIGHT[type] ?? 4;
  return { x: 0, y: index * h, w: 12, h };
}

export function ensureBlockLayout(block: BlockConfig, index: number): BlockConfig {
  if (block.layout) return block;
  return { ...block, layout: defaultBlockLayout(block.type, index) };
}

export function ensurePageBlocksLayout(blocks: BlockConfig[]): BlockConfig[] {
  return blocks.map((b, i) => ensureBlockLayout(b, i));
}

export function findPageById(site: SiteConfig, pageId: string): PageConfig | undefined {
  return site.pages.find((p) => p.id === pageId);
}

export function resolvePageRoute(site: SiteConfig, pageId: string, fallback = `/${pageId}`): string {
  return findPageById(site, pageId)?.route ?? fallback;
}

export function resolveLandingRoute(site: SiteConfig): string {
  const landingId = site.routing?.landingPageId ?? "home";
  const landing = findPageById(site, landingId);
  if (landing) return landing.route;
  const cms = site.pages.find((p) => (p.type ?? "page") === "page");
  return cms?.route ?? "/home";
}

export function resolveWizardRoute(site: SiteConfig): string {
  const wizard = site.pages.find((p) => p.type === "wizard");
  return wizard?.route ?? "/wizard";
}

export function validatePageRoute(
  site: SiteConfig,
  pageId: string,
  route: string,
): string | null {
  const trimmed = route.trim();
  if (!trimmed.startsWith("/")) return "Маршрут должен начинаться с /";
  if (trimmed !== "/" && trimmed.endsWith("/")) return "Уберите / в конце маршрута";
  const duplicate = site.pages.find((p) => p.id !== pageId && p.route === trimmed);
  if (duplicate) return `Маршрут занят страницей «${duplicate.title}»`;
  return null;
}
