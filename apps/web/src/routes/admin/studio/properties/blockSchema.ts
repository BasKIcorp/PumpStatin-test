/**
 * Схема блока: какие поля показывать в Properties,
 * в какой секции (style / content / behavior), и какой тип редактора.
 */
export interface BlockFieldSchema {
  key: string;
  label: string;
  section: "style" | "content" | "behavior";
  type: "text" | "color" | "number" | "select" | "textarea" | "json" | "checkbox";
  options?: string[];         // для select
  placeholder?: string;
  defaultValue?: unknown;
}

/** Описание блока для Palette */
export interface BlockTypeInfo {
  type: string;
  label: string;
  icon: string;
  category: "content" | "media" | "data" | "special" | "layout";
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
