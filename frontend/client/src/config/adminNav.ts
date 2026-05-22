/** Разделы и вкладки админ-панели (полная страница и встроенный режим в кабинете). */

import { ADMIN_PRESENTATION } from "./adminPresentation";

export type AdminSectionId = "dashboard" | "users" | "algorithm" | "db" | "design" | "sites";

export const ADMIN_SECTIONS: {
  id: AdminSectionId;
  label: string;
  icon: string;
  leaves: { id: string; label: string; tableLink?: string }[];
}[] = [
  {
    id: "dashboard",
    label: "Дашборд",
    icon: "LayoutDashboard",
    leaves: [{ id: "dashboard", label: "Обзор" }],
  },
  {
    id: "users",
    label: "Пользователи",
    icon: "Users",
    leaves: [
      { id: "users", label: "Список" },
      { id: "email", label: "Email / SMTP" },
    ],
  },
  {
    id: "algorithm",
    label: "Алгоритм",
    icon: "Workflow",
    leaves: [
      { id: "data-flow-studio", label: "Схема Подбора" },
      { id: "selection-settings", label: "Настройки подбора" },
    ],
  },
  {
    id: "db",
    label: "База данных",
    icon: "Database",
    leaves: [
      { id: "data", label: "Данные (таблицы)" },
      { id: "db-constructor", label: "Конструктор схемы" },
    ],
  },
  {
    id: "design",
    label: "Дизайн",
    icon: "Palette",
    leaves: [
      { id: "appearance", label: "Внешний вид → White-Label" },
      { id: "page-layout-editor", label: "Макет подбора (глобально)" },
      { id: "pdf-constructor", label: "PDF → White-Label" },
      { id: "drawings", label: "Изображения" },
    ],
  },
  {
    id: "sites",
    label: "Сайты",
    icon: "Globe",
    leaves: [{ id: "white-label", label: "White-Label" }],
  },
];

export const ADMIN_LEAF_TAB_IDS = [
  ...new Set(ADMIN_SECTIONS.flatMap((s) => s.leaves.map((l) => l.id))),
];

const DESIGN_LEAF_IDS = new Set(
  ADMIN_SECTIONS.find((s) => s.id === "design")?.leaves.map((l) => l.id) ?? [],
);

/** Секции для бокового меню с учётом презентационных флагов. */
export function getVisibleAdminSections() {
  return ADMIN_SECTIONS.filter(
    (s) => !(ADMIN_PRESENTATION.hideDesignSection && s.id === "design"),
  );
}

/** Id вкладок, видимых в навигации. */
export function getVisibleAdminLeaves(): string[] {
  return getVisibleAdminSections().flatMap((s) => s.leaves.map((l) => l.id));
}

export function isAdminLeafVisible(leaf: string): boolean {
  if (ADMIN_PRESENTATION.hideDesignSection && DESIGN_LEAF_IDS.has(leaf)) {
    return false;
  }
  return ADMIN_LEAF_TAB_IDS.includes(leaf);
}

/** Скрытые design-leaf → White-Label; неизвестный leaf → dashboard. */
export function normalizeAdminLeaf(leaf: string): string {
  if (isAdminLeafVisible(leaf)) return leaf;
  if (DESIGN_LEAF_IDS.has(leaf)) return "white-label";
  return "dashboard";
}

/** Секция, в которой находится вкладка с данным id. */
export function adminCurrentSection(leaf: string) {
  const sections = getVisibleAdminSections();
  return (
    sections.find((s) => s.leaves.some((l) => l.id === leaf)) ??
    ADMIN_SECTIONS.find((s) => s.leaves.some((l) => l.id === leaf)) ??
    sections.find((s) => s.id === "db") ??
    ADMIN_SECTIONS[0]
  );
}
