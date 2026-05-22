/**
 * Контракт полей SiteAppearance ↔ зоны экрана подбора и вкладки White-Label.
 */

export type AppearanceUiZone =
  | "colors"
  | "funnel_left"
  | "funnel_header"
  | "funnel_cards"
  | "hm_cards"
  | "stage_texts"
  | "pdf"
  | "presets";

export type AppearanceFieldKind = "color" | "text" | "file" | "json" | "boolean" | "brand" | "font";

export type AppearanceManifestEntry = {
  /** Ключ в JSON GET/PATCH /api/admin/appearance */
  apiKey: string;
  /** Имя поля FormData при загрузке файла */
  uploadField?: string;
  label: string;
  description: string;
  zone: AppearanceUiZone;
  /** Показывается на публичном сайте (воронка / работа) */
  publicSite: boolean;
  /** Только PDF-конструктор */
  pdfOnly?: boolean;
  kind: AppearanceFieldKind;
};

export const APPEARANCE_MANIFEST: AppearanceManifestEntry[] = [
  {
    apiKey: "primary_color",
    label: "Основной цвет",
    description: "Кнопки и акценты интерфейса (CSS --primary)",
    zone: "colors",
    publicSite: true,
    kind: "color",
  },
  {
    apiKey: "accent_color",
    label: "Акцентный цвет",
    description: "Вторичные акценты (CSS --accent)",
    zone: "colors",
    publicSite: true,
    kind: "color",
  },
  {
    apiKey: "funnel_page_background_color",
    label: "Фон страницы подбора",
    description: "Общий фон экранов воронки (категория, этапы)",
    zone: "colors",
    publicSite: true,
    kind: "color",
  },
  {
    apiKey: "funnel_surface_color",
    label: "Фон карточек и сайдбара",
    description: "Белые панели: сайдбар, карточки выбора",
    zone: "colors",
    publicSite: true,
    kind: "color",
  },
  {
    apiKey: "funnel_card_media_background_color",
    label: "Фон зоны фото на карточке",
    description: "Подложка под изображение на mockup-карточке",
    zone: "colors",
    publicSite: true,
    kind: "color",
  },
  {
    apiKey: "funnel_font_heading",
    label: "Шрифт заголовков",
    description: "Заголовки шапки воронки",
    zone: "colors",
    publicSite: true,
    kind: "font",
  },
  {
    apiKey: "funnel_font_body",
    label: "Шрифт текста",
    description: "Текст карточек и подписей на страницах подбора",
    zone: "colors",
    publicSite: true,
    kind: "font",
  },
  {
    apiKey: "funnel_text_color",
    label: "Основной текст",
    description: "Текст на экране подбора (параметры, характеристики)",
    zone: "colors",
    publicSite: true,
    kind: "color",
  },
  {
    apiKey: "funnel_text_muted_color",
    label: "Вторичный текст",
    description: "Подписи полей и приглушённый текст",
    zone: "colors",
    publicSite: true,
    kind: "color",
  },
  {
    apiKey: "funnel_panel_header_background_color",
    label: "Фон шапки панели",
    description: "Сплошной фон заголовков «Параметры подбора», «Кривые» и т.д.",
    zone: "colors",
    publicSite: true,
    kind: "color",
  },
  {
    apiKey: "funnel_panel_header_text_color",
    label: "Текст шапки панели",
    description: "Цвет заголовков панелей на экране работы",
    zone: "colors",
    publicSite: true,
    kind: "color",
  },
  {
    apiKey: "funnel_button_background_color",
    label: "Фон основной кнопки",
    description: "«Подобрать» и главные действия; пусто — как основной цвет",
    zone: "colors",
    publicSite: true,
    kind: "color",
  },
  {
    apiKey: "funnel_button_text_color",
    label: "Текст основной кнопки",
    description: "Подпись на кнопке «Подобрать»",
    zone: "colors",
    publicSite: true,
    kind: "color",
  },
  {
    apiKey: "funnel_button_secondary_background_color",
    label: "Фон вторичной кнопки",
    description: "«Сбросить», «В ТКП»; пусто — как фон панели",
    zone: "colors",
    publicSite: true,
    kind: "color",
  },
  {
    apiKey: "funnel_button_secondary_text_color",
    label: "Текст вторичной кнопки",
    description: "Пусто — как основной текст",
    zone: "colors",
    publicSite: true,
    kind: "color",
  },
  {
    apiKey: "funnel_table_row_alt_background_color",
    label: "Фон чередующихся строк таблицы",
    description: "Не связан с фоном фото на карточках",
    zone: "colors",
    publicSite: true,
    kind: "color",
  },
  {
    apiKey: "funnel_table_row_selected_background_color",
    label: "Фон выбранной строки таблицы",
    description: "Выделение насоса в результатах подбора",
    zone: "colors",
    publicSite: true,
    kind: "color",
  },
  {
    apiKey: "funnel_sidebar_wordmark_url",
    uploadField: "funnel_sidebar_wordmark",
    label: "Вертикальный логотип слева",
    description: "Левая колонка воронки на всех шагах подбора",
    zone: "funnel_left",
    publicSite: true,
    kind: "file",
  },
  {
    apiKey: "sidebar_text",
    label: "Текст под логотипом",
    description: "Подпись под wordmark в левой колонке",
    zone: "funnel_left",
    publicSite: true,
    kind: "text",
  },
  {
    apiKey: "selection_flow_header_logo_url",
    uploadField: "selection_flow_header_logo",
    label: "Логотип в шапке этапов",
    description: "Шапка воронки и экран «Работа»",
    zone: "funnel_header",
    publicSite: true,
    kind: "file",
  },
  {
    apiKey: "logo_url",
    uploadField: "logo",
    label: "Общий логотип",
    description: "Запасной логотип шапки, если поле «шапка» пусто",
    zone: "funnel_header",
    publicSite: true,
    kind: "file",
  },
  {
    apiKey: "selection_card_caption_logo_url",
    uploadField: "selection_card_caption_logo",
    label: "Значок на карточках",
    description: "Мини-лого слева от названия карточки выбора",
    zone: "funnel_cards",
    publicSite: true,
    kind: "file",
  },
  {
    apiKey: "selection_category_full_width",
    label: "Карточки класса на всю ширину",
    description: "Первый шаг воронки — блоки во всю ширину",
    zone: "funnel_cards",
    publicSite: true,
    kind: "boolean",
  },
  {
    apiKey: "selection_card_settings",
    label: "Размеры карточек",
    description: "Ширина, зона фото, типографика mockup-карточек",
    zone: "funnel_cards",
    publicSite: true,
    kind: "json",
  },
  {
    apiKey: "hydromodule_card_urls",
    label: "Фото линеек ГМ",
    description: "Карточки на шаге «Выберите линейку гидромодуля»",
    zone: "hm_cards",
    publicSite: true,
    kind: "file",
  },
  {
    apiKey: "selection_stage_titles",
    label: "Заголовки этапов (title + subtitle)",
    description: "Заголовок и подзаголовок в шапке каждого шага",
    zone: "stage_texts",
    publicSite: true,
    kind: "json",
  },
  {
    apiKey: "stage_headings",
    label: "Короткие заголовки этапов",
    description: "Плоские заголовки (legacy, если нет selection_stage_titles)",
    zone: "stage_texts",
    publicSite: true,
    kind: "json",
  },
  {
    apiKey: "cp_logo_url",
    uploadField: "cp_logo",
    label: "Логотип КП (2-й лист PDF)",
    description: "Коммерческое предложение",
    zone: "pdf",
    publicSite: false,
    pdfOnly: true,
    kind: "file",
  },
  {
    apiKey: "tech_specs_logo_url",
    uploadField: "tech_specs_logo",
    label: "Логотип тех. листа",
    description: "3-й и следующие листы PDF",
    zone: "pdf",
    publicSite: false,
    pdfOnly: true,
    kind: "file",
  },
  {
    apiKey: "brand_key",
    label: "Ключ бренда",
    description: "Метаданные; на сайте не подставляет статические ассеты",
    zone: "presets",
    publicSite: false,
    kind: "brand",
  },
];

export const APPEARANCE_ZONE_LABELS: Record<AppearanceUiZone, string> = {
  colors: "Цвета",
  funnel_left: "Левая колонка воронки",
  funnel_header: "Шапка подбора",
  funnel_cards: "Карточки выбора",
  hm_cards: "Карточки гидромодулей",
  stage_texts: "Тексты этапов",
  pdf: "PDF",
  presets: "Пресеты бренда",
};

export const APPEARANCE_ZONE_ORDER: AppearanceUiZone[] = [
  "colors",
  "funnel_left",
  "funnel_header",
  "funnel_cards",
  "hm_cards",
  "stage_texts",
  "pdf",
  "presets",
];

export function manifestEntriesForZone(zone: AppearanceUiZone): AppearanceManifestEntry[] {
  return APPEARANCE_MANIFEST.filter((e) => e.zone === zone);
}
