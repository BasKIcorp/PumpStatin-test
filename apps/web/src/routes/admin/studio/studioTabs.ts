export type ConstructorTab = "frontend" | "pdf";

export type FrontendMode = "pages" | "settings";

export const CONSTRUCTOR_TABS: { id: ConstructorTab; label: string }[] = [
  { id: "frontend", label: "Фронт" },
  { id: "pdf", label: "PDF" },
];

export const FRONTEND_MODES: { id: FrontendMode; label: string }[] = [
  { id: "pages", label: "Страницы" },
  { id: "settings", label: "Сайт" },
];
