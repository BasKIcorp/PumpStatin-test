/**
 * Схема блока: какие поля показывать в Properties,
 * в какой секции (style / content / behavior), и какой тип редактора.
 */
export interface BlockFieldSchema {
  key: string;
  label: string;
  section: "style" | "content" | "behavior" | "data";
  type: "text" | "color" | "number" | "select" | "textarea" | "json" | "checkbox";
  options?: string[];
  placeholder?: string;
  defaultValue?: unknown;
}

/** Описание блока для Palette */
export interface BlockTypeInfo {
  type: string;
  label: string;
  icon: string;
  category: "content" | "media" | "data" | "special" | "layout" | "auth" | "cabinet" | "wizard";
  ioRole?: "input" | "action" | "output" | "nav" | "content";
  fields: BlockFieldSchema[];
}

const BLOCK_SCHEMAS: BlockTypeInfo[] = [
  {
    type: "hero",
    label: "Hero (заголовок + CTA)",
    icon: "🎯",
    category: "content",
    fields: [
      { key: "background", label: "Фон", section: "style", type: "color", defaultValue: "#1e4a8c" },
      { key: "heading", label: "Заголовок", section: "content", type: "text", defaultValue: "Заголовок" },
      { key: "subheading", label: "Подзаголовок", section: "content", type: "text", defaultValue: "Подзаголовок" },
      { key: "cta.label", label: "Текст кнопки", section: "content", type: "text", defaultValue: "Подобрать" },
      { key: "cta.pageId", label: "Ссылка (страница)", section: "behavior", type: "text", defaultValue: "wizard" },
    ],
  },
  {
    type: "rich-text",
    label: "Rich Text (контент)",
    icon: "📝",
    category: "content",
    fields: [
      { key: "content", label: "HTML-контент", section: "content", type: "textarea", defaultValue: "<p>Текст</p>" },
    ],
  },
  {
    type: "card-grid",
    label: "Card Grid (сетка карточек)",
    icon: "📊",
    category: "content",
    fields: [
      { key: "columns", label: "Колонок", section: "style", type: "number", defaultValue: 3 },
      { key: "cards", label: "Карточки (JSON)", section: "content", type: "json", defaultValue: [] },
    ],
  },
  {
    type: "wizard",
    label: "Визард подбора",
    icon: "⚙️",
    category: "special",
    fields: [],
  },
  {
    type: "product-grid",
    label: "Каталог товаров",
    icon: "🏷️",
    category: "data",
    fields: [
      { key: "columns", label: "Колонок", section: "style", type: "number", defaultValue: 3 },
      { key: "filter", label: "Показывать фильтр", section: "behavior", type: "checkbox", defaultValue: true },
    ],
  },
  {
    type: "contact-form",
    label: "Форма обратной связи",
    icon: "📧",
    category: "content",
    fields: [
      { key: "email", label: "Email для уведомлений", section: "behavior", type: "text", defaultValue: "" },
    ],
  },
  {
    type: "map",
    label: "Карта",
    icon: "🗺️",
    category: "media",
    fields: [
      { key: "address", label: "Адрес", section: "content", type: "text", defaultValue: "Москва, ул. Примерная" },
      { key: "lat", label: "Широта", section: "content", type: "number", defaultValue: 55.75 },
      { key: "lng", label: "Долгота", section: "content", type: "number", defaultValue: 37.62 },
    ],
  },
  {
    type: "gallery",
    label: "Галерея изображений",
    icon: "🖼️",
    category: "media",
    fields: [
      { key: "images", label: "Изображения (JSON)", section: "content", type: "json", defaultValue: [] },
    ],
  },
  {
    type: "accordion",
    label: "Аккордеон",
    icon: "📑",
    category: "content",
    fields: [
      { key: "items", label: "Элементы (JSON)", section: "content", type: "json", defaultValue: [] },
    ],
  },
  {
    type: "tabs",
    label: "Табы",
    icon: "📌",
    category: "content",
    fields: [
      { key: "tabs", label: "Вкладки (JSON)", section: "content", type: "json", defaultValue: [] },
    ],
  },
  {
    type: "divider",
    label: "Разделитель",
    icon: "➖",
    category: "layout",
    fields: [
      { key: "style", label: "Стиль", section: "style", type: "select", defaultValue: "solid", options: ["solid", "dashed", "dotted"] },
      { key: "color", label: "Цвет", section: "style", type: "color", defaultValue: "#e5e7eb" },
    ],
  },
  {
    type: "image",
    label: "Изображение",
    icon: "🖼️",
    category: "media",
    fields: [
      { key: "src", label: "URL", section: "content", type: "text", defaultValue: "" },
      { key: "alt", label: "Alt-текст", section: "content", type: "text", defaultValue: "" },
      { key: "caption", label: "Подпись", section: "content", type: "text", defaultValue: "" },
    ],
  },
  {
    type: "video",
    label: "Видео",
    icon: "🎬",
    category: "media",
    fields: [
      { key: "url", label: "URL видео", section: "content", type: "text", defaultValue: "" },
      { key: "title", label: "Заголовок", section: "content", type: "text", defaultValue: "Видео" },
    ],
  },
  {
    type: "auth/brand-panel",
    label: "Бренд (login)",
    icon: "🖼️",
    category: "auth",
    fields: [
      { key: "src", label: "URL логотипа", section: "content", type: "text", defaultValue: "" },
      { key: "alt", label: "Alt-текст", section: "content", type: "text", defaultValue: "" },
    ],
  },
  {
    type: "auth/login-form",
    label: "Форма входа",
    icon: "🔐",
    category: "auth",
    fields: [{ key: "title", label: "Заголовок", section: "content", type: "text", defaultValue: "Вход" }],
  },
  {
    type: "auth/quick-login",
    label: "Быстрый вход",
    icon: "⚡",
    category: "auth",
    fields: [],
  },
  {
    type: "auth/admin-entry",
    label: "Вход admin",
    icon: "🛠️",
    category: "auth",
    fields: [],
  },
  {
    type: "auth/back-link",
    label: "Ссылка назад",
    icon: "↩️",
    category: "auth",
    fields: [
      { key: "label", label: "Текст", section: "content", type: "text", defaultValue: "← На главную" },
      { key: "href", label: "URL", section: "behavior", type: "text", defaultValue: "/" },
    ],
  },
  {
    type: "cabinet/workspace",
    label: "Кабинет (полный)",
    icon: "📁",
    category: "cabinet",
    fields: [],
  },
  {
    type: "wizard/step-heading",
    label: "Заголовок шага",
    icon: "📋",
    category: "wizard",
    ioRole: "nav",
    fields: [
      { key: "stepId", label: "ID шага", section: "behavior", type: "text", defaultValue: "product-class" },
      { key: "title", label: "Заголовок", section: "content", type: "text" },
      { key: "subtitle", label: "Подзаголовок", section: "content", type: "text" },
    ],
  },
  {
    type: "wizard/card-grid-strela",
    label: "Карточки Strela",
    icon: "🎴",
    category: "wizard",
    ioRole: "nav",
    fields: [{ key: "stepId", label: "ID шага", section: "behavior", type: "text", defaultValue: "product-class" }],
  },
  {
    type: "wizard/card-grid-simple",
    label: "Карточки простые",
    icon: "🃏",
    category: "wizard",
    ioRole: "nav",
    fields: [{ key: "stepId", label: "ID шага", section: "behavior", type: "text", defaultValue: "product-class" }],
  },
  {
    type: "wizard/legacy-selection",
    label: "Форма подбора (legacy)",
    icon: "⚙️",
    category: "wizard",
    ioRole: "input",
    fields: [
      {
        key: "_dataStub",
        label: "Привязка к алгоритму",
        section: "data",
        type: "text",
        defaultValue: "Настраивается отдельно через Cursor",
      },
    ],
  },
];

export function getBlockSchemas(): BlockTypeInfo[] {
  return BLOCK_SCHEMAS;
}

export function getSchema(type: string): BlockTypeInfo | undefined {
  return BLOCK_SCHEMAS.find((s) => s.type === type);
}

export const BLOCK_LABELS: Record<string, string> = {};
export const BLOCK_ICONS: Record<string, string> = {};
for (const s of BLOCK_SCHEMAS) {
  BLOCK_LABELS[s.type] = s.label;
  BLOCK_ICONS[s.type] = s.icon;
}
