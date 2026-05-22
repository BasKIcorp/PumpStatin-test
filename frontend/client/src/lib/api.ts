// lib/api.ts
import { apiRequest } from "./queryClient";
import { Pump, StationResult } from "./types";
import axios, { ensureCsrf, getCurrentCsrfToken } from "./csrf";
import type { SelectionCardSettings } from "./selectionCardSettings";

console.log("✅ Файл api.ts загружен");  // ← в самом верху

// Функция для извлечения имени файла из Content-Disposition
function getFilenameFromContentDisposition(contentDisposition: string | undefined | null): string | null {
  if (!contentDisposition) return null;

  const utf8 = contentDisposition.match(/filename\*=(?:UTF-8''|utf-8'')([^;\n]+)/i);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      return utf8[1].trim();
    }
  }

  const plain = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
  if (plain?.[1]) {
    return plain[1].replace(/['"]/g, "").trim();
  }
  return null;
}

function resolvePdfFilename(
  headers: Record<string, unknown> | undefined,
  fallback: string,
): string {
  if (!headers) return fallback;
  const h = headers as Record<string, string | undefined>;
  const cd =
    h["content-disposition"] ??
    h["Content-Disposition"] ??
    (typeof (headers as { get?: (n: string) => string }).get === "function"
      ? (headers as { get: (n: string) => string }).get("content-disposition")
      : undefined);
  return getFilenameFromContentDisposition(cd) || fallback;
}

const PDF_WARNINGS_HEADER = "x-pdf-warnings-b64";

/** Сообщения о пропущенных файлах из заголовка ответа PDF (X-Pdf-Warnings-B64, JSON в urlsafe base64). */
export function parsePdfAssetWarningsFromHeaders(
  headers: Record<string, string | undefined | null> | unknown | undefined,
): string[] {
  if (!headers || typeof headers !== "object") return [];
  const h = headers as Record<string, string | undefined | null> & {
    get?: (name: string) => string | undefined;
  };
  const raw =
    h[PDF_WARNINGS_HEADER] ??
    h["X-Pdf-Warnings-B64"] ??
    (typeof h.get === "function" ? h.get(PDF_WARNINGS_HEADER) : undefined);
  if (!raw || typeof raw !== "string") return [];
  try {
    let b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    const pad = (4 - (b64.length % 4)) % 4;
    if (pad) b64 += "=".repeat(pad);
    const json = atob(b64);
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => String(x)).filter(Boolean);
  } catch {
    return [];
  }
}

export type PdfDownloadResult = { blob: Blob; filename: string; pdfWarnings: string[] };

/* -------------------- GET MATCHING PUMPS -------------------- */

export async function getMatchingPumps(
  Q: number,
  H: number,
  n1: number,
  n2: number,
  nasos_type: string[],
  fluid_type: string,
  temperature: number,
  concentration?: string  // ← добавлено
): Promise<Pump[]> {
  try {
    const params = {
      Q,
      H,
      n1,
      n2,
      fluid_type,
      temperature,
      ...(concentration && { concentration })
    };

    console.log("📤 Параметры запроса к API:", {
      Q, H, n1, n2, nasos_type, fluid_type, temperature
    });
    
    console.log("🌐 Базовый URL axios:", axios.defaults.baseURL);
    console.log("🌐 Полный URL запроса:", `${axios.defaults.baseURL}/api/get_matching_pumps`);

    // Добавляем каждый тип насоса отдельно
    const response = await axios.get('/api/get_matching_pumps', {
      params: {
        ...params,
        nasos_type
      },
      timeout: 10000 // 10 секунд таймаут
    });

    console.log("✅ Ответ получен:", response.status);

    return response.data;
  } catch (error: any) {
    console.error('❌ Ошибка при получении насосов:', error);
    console.error('❌ Детали ошибки:', {
      message: error.message,
      code: error.code,
      response: error.response?.status,
      url: error.config?.url,
      baseURL: error.config?.baseURL
    });
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_CONNECTION_REFUSED') {
      throw new Error('Сервер недоступен. Проверьте подключение к интернету и убедитесь, что сервер запущен на 62.217.176.34:8000');
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Превышено время ожидания ответа от сервера.');
    }
    
    throw new Error(`Ошибка при загрузке данных: ${error.message}`);
  }
}



/* -------------------- GET STATION RESULT -------------------- */
export async function getStationResult(
  params: Record<string, any>
): Promise<StationResult> {
  // нормализуем «расширительный бак»
  if (params.расширительный_бак === "false") {
    params.расширительный_бак = "отсутствует";
  } else if (
    params.расширительный_бак === "true" &&
    params.расширительный_бак_значение
  ) {
    params.расширительный_бак = params.расширительный_бак_значение;
    delete params.расширительный_бак_значение;
  }

  const response = await axios.get('/api/get_station_result', {
    params
  });

  return response.data;
}

/* -------------------- DOWNLOAD PDF (новая ручка) -------------------- */
export async function downloadStationPdf(params: Record<string, any>): Promise<PdfDownloadResult> {
  // те же правила, что и в getStationResult
  if (params.расширительный_бак === "false") {
    params.расширительный_бак = "отсутствует";
  } else if (
    params.расширительный_бак === "true" &&
    params.расширительный_бак_значение
  ) {
    params.расширительный_бак = params.расширительный_бак_значение;
    delete params.расширительный_бак_значение;
  }

  // Извлекаем graphs_image если есть (может быть большим, передадим отдельно)
  const graphsImage = params.graphs_image;
  const paramsWithoutImage = { ...params };
  delete paramsWithoutImage.graphs_image;

  // Используем POST если есть изображение (может быть слишком большим для GET), иначе GET
  let response;
  if (graphsImage) {
    // Используем POST с JSON body для передачи base64 изображения
    response = await axios.post('/api/download_station_pdf', {
      ...paramsWithoutImage,
      graphs_image: graphsImage  // base64 строка уже без префикса data:image/png;base64,
    }, {
      responseType: 'blob',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } else {
    // Используем GET как раньше
    response = await axios.get('/api/download_station_pdf', {
      params: paramsWithoutImage,
      responseType: 'blob'
    });
  }

  // filename ищем в Content-Disposition
  const contentDisposition = response.headers['content-disposition'];
  const filename = getFilenameFromContentDisposition(contentDisposition);
  
  if (!filename) {
    throw new Error('Filename not found in Content-Disposition header');
  }

  const pdfWarnings = parsePdfAssetWarningsFromHeaders(response.headers);

  return {
    blob: response.data,
    filename,
    pdfWarnings,
  };
}

/** Только основной лист (3-я страница полного ТКП), без расхода номера TKP */
export async function downloadTechSheetPdf(params: Record<string, any>): Promise<PdfDownloadResult> {
  if (params.расширительный_бак === "false") {
    params.расширительный_бак = "отсутствует";
  } else if (
    params.расширительный_бак === "true" &&
    params.расширительный_бак_значение
  ) {
    params.расширительный_бак = params.расширительный_бак_значение;
    delete params.расширительный_бак_значение;
  }

  const graphsImage = params.graphs_image;
  const paramsWithoutImage = { ...params };
  delete paramsWithoutImage.graphs_image;

  let response;
  if (graphsImage) {
    response = await axios.post("/api/download_tech_sheet_pdf", {
      ...paramsWithoutImage,
      graphs_image: graphsImage,
    }, {
      responseType: "blob",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } else {
    response = await axios.get("/api/download_tech_sheet_pdf", {
      params: paramsWithoutImage,
      responseType: "blob",
    });
  }

  const contentDisposition = response.headers["content-disposition"];
  const filename = getFilenameFromContentDisposition(contentDisposition);

  if (!filename) {
    throw new Error("Filename not found in Content-Disposition header");
  }

  const pdfWarnings = parsePdfAssetWarningsFromHeaders(response.headers);

  return {
    blob: response.data,
    filename,
    pdfWarnings,
  };
}

/** Полный PDF проекта: титул + ТКП со сводной таблицей + техлист по каждому подбору + закрывающая */
export async function downloadProjectPackagePdf(
  projectId: number,
  siteSlug?: string | null,
): Promise<PdfDownloadResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (siteSlug) {
    headers["X-Site-Slug"] = siteSlug;
  }
  const response = await axios.post(`/api/user/projects/${projectId}/download_pdf/`, {}, {
    responseType: "blob",
    headers,
  });

  if (response.status >= 400) {
    let msg = `Ошибка ${response.status}`;
    try {
      const text = await (response.data as Blob).text();
      const j = JSON.parse(text);
      msg = j.error || text || msg;
    } catch {
      msg = await (response.data as Blob).text().catch(() => msg);
    }
    throw new Error(msg);
  }

  const ct = (response.headers["content-type"] || "").toLowerCase();
  if (ct.includes("application/json")) {
    const text = await (response.data as Blob).text();
    try {
      const j = JSON.parse(text) as { error?: string };
      throw new Error(j.error || text || "Ошибка формирования PDF");
    } catch (e: unknown) {
      if (e instanceof Error && e.message !== text) throw e;
      throw new Error(text || "Ошибка формирования PDF");
    }
  }

  const filename = resolvePdfFilename(
    response.headers as Record<string, unknown>,
    `project_${projectId}_tkp.pdf`,
  );
  const pdfWarnings = parsePdfAssetWarningsFromHeaders(response.headers);
  return { blob: response.data as Blob, filename, pdfWarnings };
}

/* -------------------- SEND PDF EMAIL -------------------- */
export async function sendStationPdfEmail(email: string, filename: string) {
  try {
    console.log('📧 Отправляем email:', { email, filename });
    
    // Простая отправка без CSRF токена (временно)
    const response = await axios.post('/api/send_station_pdf_email', {
      email,
      filename
    });
    
    console.log('✅ Email отправлен успешно:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Ошибка при отправке email:', error);
    throw error;
  }
}

/* -------------------- SEND PDF EMAIL TO SELF -------------------- */
export async function sendStationPdfEmailToSelf(email: string, filename: string) {
  try {
    console.log('📧 Отправляем email себе:', { email, filename });
    
    // Убеждаемся, что CSRF токен получен
    await ensureCsrf();
    
    // Получаем сохраненный токен
    const csrfToken = getCurrentCsrfToken();
    console.log('🔐 Используем CSRF токен для отправки email себе:', csrfToken);
    
    const response = await axios.post('/api/send_station_pdf_email_to_self', {
      email,
      filename
    }, {
      headers: csrfToken ? {
        'X-CSRFToken': csrfToken
      } : {}
    });
    
    console.log('✅ Email себе отправлен успешно:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Ошибка при отправке email себе:', error);
    throw error;
  }
}

/* -------------------- GENERATE PDF AND PREVIEW -------------------- */
export async function generatePdfAndPreview(params: Record<string, any>) {
  try {
    // Убеждаемся, что CSRF токен получен
    console.log('🔐 Получаем CSRF токен для генерации PDF...');
    await ensureCsrf();
    
    // Получаем сохраненный токен
    const csrfToken = getCurrentCsrfToken();
    console.log('🔐 Используем CSRF токен для PDF:', csrfToken);
    
    const response = await axios.get('/api/download_station_pdf', {
      params,
      responseType: 'blob',
      headers: csrfToken ? {
        'X-CSRFToken': csrfToken
      } : {}
    });

    // filename ищем в Content-Disposition
    const contentDisposition = response.headers['content-disposition'];
    const filename = getFilenameFromContentDisposition(contentDisposition);
    
    if (!filename) {
      throw new Error('Filename not found in Content-Disposition header');
    }

    const objectUrl = URL.createObjectURL(response.data);
    
    // Устанавливаем src для iframe (если есть элемент с id='pdfFrame')
    const pdfFrame = document.getElementById('pdfFrame') as HTMLIFrameElement;
    if (pdfFrame) {
      pdfFrame.src = objectUrl;
    }

    return { filename, objectUrl };
  } catch (error) {
    console.error('❌ Ошибка при генерации PDF:', error);
    throw error;
  }
}
/* -------------------- ADMIN API (только для is_staff, с credentials) -------------------- */

/** Заголовки этапов воронки (ключ шага → title/subtitle) */
export type SelectionStageTitles = Partial<
  Record<
    "category" | "hm_line" | "pu_line" | "pu_subtype" | "simpel_series",
    { title?: string; subtitle?: string }
  >
>;

/** Плоские заголовки этапов воронки (поля SiteAppearance / legacy demo). */
export type StageHeadingsFlat = Partial<
  Record<"category" | "hm_line" | "pu_line" | "pu_subtype", string>
>;

export type AdminAppearance = {
  logo_url: string | null;
  cp_logo_url: string | null;
  tech_specs_logo_url: string | null;
  primary_color: string;
  accent_color: string;
  funnel_page_background_color?: string;
  funnel_surface_color?: string;
  funnel_card_media_background_color?: string;
  funnel_font_heading?: "segoe" | "open_sans" | "system";
  funnel_font_body?: "segoe" | "open_sans" | "system";
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
  sidebar_text: string;
  /** Бренд интерфейса подбора: Стрела или Simpel */
  brand_key?: "strela" | "simpel";
  /** URL изображений карточек линеек гидромодуля (ключ — id линии, например bps-c-pro) */
  hydromodule_card_urls?: Partial<Record<string, string | null>>;
  /** Логотип левой колонки воронки по слайдам 1–4 */
  funnel_sidebar_logo_urls?: Partial<Record<"1" | "2" | "3" | "4", string | null>>;
  /** Вертикальный wordmark слева на всех шагах воронки (SVG/PNG), пусто — на сайте дефолтный SVG */
  funnel_sidebar_wordmark_url?: string | null;
  /** Значок слева от названия карточки воронки (приоритетнее логотипов слайдов и основного логотипа) */
  selection_card_caption_logo_url?: string | null;
  /** Горизонтальный логотип в шапке этапов подбора (воронка + экран параметров) */
  selection_flow_header_logo_url?: string | null;
  selection_stage_titles?: SelectionStageTitles | null;
  selection_category_full_width?: boolean;
  /** Размеры и типографика mockup-карточек воронки (частичный JSON) */
  selection_card_settings?: SelectionCardSettings | null;
  stage_headings?: StageHeadingsFlat | null;
  /** Версия для cache-bust URL медиа (timestamp updated_at) */
  appearance_version?: string;
  updated_at?: string | null;
};

export async function adminLogin(username: string, password: string): Promise<{ ok: boolean; username: string }> {
  const { data } = await axios.post<{ ok: boolean; username: string }>("/api/admin/login", {
    username,
    password,
  });
  return data;
}

export async function adminLogout(): Promise<void> {
  await axios.post("/api/admin/logout");
}

export type AdminWhoamiResponse = {
  username: string;
  ok: boolean;
  pg_app_data_schema?: string;
  read_model_data_from_ext?: boolean;
};

export async function adminWhoami(): Promise<AdminWhoamiResponse> {
  const { data } = await axios.get<AdminWhoamiResponse>("/api/admin/whoami");
  return data;
}

export async function adminGetAppearance(): Promise<AdminAppearance> {
  const { data } = await axios.get<AdminAppearance>("/api/admin/appearance");
  return data;
}

export async function adminPatchAppearance(payload: {
  primary_color?: string;
  accent_color?: string;
  funnel_page_background_color?: string;
  funnel_surface_color?: string;
  funnel_card_media_background_color?: string;
  funnel_font_heading?: "segoe" | "open_sans" | "system";
  funnel_font_body?: "segoe" | "open_sans" | "system";
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
  brand_key?: "strela" | "simpel";
  selection_stage_titles?: SelectionStageTitles | null;
  selection_category_full_width?: boolean;
  selection_card_settings?: SelectionCardSettings | null;
  stage_headings?: StageHeadingsFlat | null;
}): Promise<AdminAppearance> {
  const { data } = await axios.patch("/api/admin/appearance", payload);
  return data;
}

function _appearanceUploadUrl(siteSlug?: string): string {
  const q = siteSlug ? `?site=${encodeURIComponent(siteSlug)}` : "";
  return `/api/admin/appearance${q}`;
}

export async function adminUploadLogo(file: File, siteSlug?: string): Promise<AdminAppearance> {
  const formData = new FormData();
  formData.append("logo", file);
  const { data } = await axios.post<AdminAppearance>(_appearanceUploadUrl(siteSlug), formData);
  return data;
}

/** Загрузка логотипа КП (2-ой лист). */
export async function adminUploadCpLogo(file: File, siteSlug?: string): Promise<AdminAppearance> {
  const formData = new FormData();
  formData.append("cp_logo", file);
  const { data } = await axios.post<AdminAppearance>(_appearanceUploadUrl(siteSlug), formData);
  return data;
}

/** Загрузка логотипа тех. характеристик (3-й лист). */
export async function adminUploadTechSpecsLogo(file: File, siteSlug?: string): Promise<AdminAppearance> {
  const formData = new FormData();
  formData.append("tech_specs_logo", file);
  const { data } = await axios.post<AdminAppearance>(_appearanceUploadUrl(siteSlug), formData);
  return data;
}

/** Карточка линейки на шаге «Выберите линейку гидромодуля» */
export async function adminUploadHydromoduleCard(
  formFieldName: string,
  file: File,
  siteSlug?: string,
): Promise<AdminAppearance> {
  const formData = new FormData();
  formData.append(formFieldName, file);
  const { data } = await axios.post<AdminAppearance>(_appearanceUploadUrl(siteSlug), formData);
  return data;
}

/** Логотип левой колонки воронки: slide 1–4 → поле funnel_sidebar_logo_N */
export async function adminUploadFunnelSidebarLogo(
  slide: 1 | 2 | 3 | 4,
  file: File,
  siteSlug?: string,
): Promise<AdminAppearance> {
  const formData = new FormData();
  formData.append(`funnel_sidebar_logo_${slide}`, file);
  const { data } = await axios.post<AdminAppearance>(_appearanceUploadUrl(siteSlug), formData);
  return data;
}

/** Вертикальный логотип слева на всех шагах воронки (SVG или растровое изображение). */
export async function adminUploadFunnelSidebarWordmark(file: File, siteSlug?: string): Promise<AdminAppearance> {
  const formData = new FormData();
  formData.append("funnel_sidebar_wordmark", file);
  const { data } = await axios.post<AdminAppearance>(_appearanceUploadUrl(siteSlug), formData);
  return data;
}

/** Значок слева от названия карточки на шагах воронки (PNG/SVG). */
export async function adminUploadSelectionCardCaptionLogo(file: File, siteSlug?: string): Promise<AdminAppearance> {
  const formData = new FormData();
  formData.append("selection_card_caption_logo", file);
  const { data } = await axios.post<AdminAppearance>(_appearanceUploadUrl(siteSlug), formData);
  return data;
}

/** Горизонтальный логотип в шапке этапов подбора (воронка и экран параметров). */
export async function adminUploadSelectionFlowHeaderLogo(file: File, siteSlug?: string): Promise<AdminAppearance> {
  const formData = new FormData();
  formData.append("selection_flow_header_logo", file);
  const { data } = await axios.post<AdminAppearance>(_appearanceUploadUrl(siteSlug), formData);
  return data;
}

/** Заполнить поля витрины файлами пресета strela/simpel из selection-assets. */
export async function adminApplyBrandPreset(
  siteSlug: string,
  preset: "strela" | "simpel",
): Promise<AdminAppearance> {
  const { data } = await axios.post<AdminAppearance>(
    `/api/admin/appearance/apply-preset?site=${encodeURIComponent(siteSlug)}`,
    { preset },
  );
  return data;
}

/** Позиции текста на страницах PDF (из админки). first_page: tkp_right_x, tkp_top_y, font_size; second_page: commercial_offer_y, pump_text_left, ...; main_page: content_top_cm, header_top_cm, ... */
export type TextOverlayConfig = {
  first_page?: { tkp_right_x?: number; tkp_top_y?: number; font_size?: number };
  second_page?: Record<string, number>;
  main_page?: Record<string, number>;
};

export type AdminPdfSettings = {
  include_first_page: boolean;
  include_last_page: boolean;
  include_second_page: boolean;
  include_third_page: boolean;
  second_page_mode: "default" | "custom_pdf";
  second_page_pdf_url: string | null;
  first_page_pdf_url: string | null;
  last_page_pdf_url: string | null;
  third_page_pdf_url: string | null;
  graph_scale: number;
  graph_x_offset: number;
  mass_block_offset_pt: number;
  drawing_width_ratio: number;
  text_overlay_config: TextOverlayConfig | null;
};

/** URL изображения шаблона страницы для визуального редактора (first/second/main). */
export function getPdfTemplatePreviewUrl(page: "first" | "second" | "main", siteSlug?: string): string {
  const base = axios.defaults.baseURL ?? "";
  const q = siteSlug ? `?site=${encodeURIComponent(siteSlug)}` : "";
  return `${base}/api/admin/pdf-template-preview/${page}${q}`;
}

export async function adminGetPdfSettings(siteSlug?: string): Promise<AdminPdfSettings> {
  const q = siteSlug ? `?site=${encodeURIComponent(siteSlug)}` : "";
  const { data } = await axios.get<AdminPdfSettings>(`/api/admin/pdf-settings${q}`);
  return data;
}

export async function adminPatchPdfSettings(payload: Partial<AdminPdfSettings>, siteSlug?: string): Promise<AdminPdfSettings> {
  const q = siteSlug ? `?site=${encodeURIComponent(siteSlug)}` : "";
  const { data } = await axios.patch<AdminPdfSettings>(`/api/admin/pdf-settings${q}`, payload);
  return data;
}

export async function adminPdfContextSchema(): Promise<{
  schema_version: string;
  sections: Record<string, string>;
}> {
  const { data } = await axios.get("/api/admin/pdf/context-schema");
  return data;
}

export async function adminPdfTemplatePublished(key: string): Promise<{
  key: string;
  revision_id: number;
  version_no: number;
  required_fields: string[];
  snapshot: Record<string, unknown>;
}> {
  const enc = encodeURIComponent(key.trim());
  const { data } = await axios.get(`/api/admin/pdf-template-published/${enc}`);
  return data;
}

export async function adminPdfContextPreview(payload: {
  params: Record<string, unknown>;
  selection_meta?: Record<string, unknown>;
  pdf_template_key?: string | null;
}): Promise<{ station_result: Record<string, unknown>; pdf_context: Record<string, unknown> }> {
  await ensureCsrf();
  const { data } = await axios.post<{ station_result: Record<string, unknown>; pdf_context: Record<string, unknown> }>(
    "/api/admin/pdf/context-preview",
    payload,
  );
  return data;
}

function buildFormDataWithFile(field: string, file: File): FormData {
  const formData = new FormData();
  formData.append(field, file);
  return formData;
}

function _pdfQ(siteSlug?: string) {
  return siteSlug ? `?site=${encodeURIComponent(siteSlug)}` : "";
}

export async function adminUploadFirstPagePdf(file: File, siteSlug?: string): Promise<AdminPdfSettings> {
  const { data } = await axios.patch<AdminPdfSettings>(`/api/admin/pdf-settings${_pdfQ(siteSlug)}`, buildFormDataWithFile("first_page_pdf", file));
  return data;
}

export async function adminUploadSecondPagePdf(file: File, siteSlug?: string): Promise<AdminPdfSettings> {
  const { data } = await axios.patch<AdminPdfSettings>(`/api/admin/pdf-settings${_pdfQ(siteSlug)}`, buildFormDataWithFile("second_page_pdf", file));
  return data;
}

export async function adminUploadLastPagePdf(file: File, siteSlug?: string): Promise<AdminPdfSettings> {
  const { data } = await axios.patch<AdminPdfSettings>(`/api/admin/pdf-settings${_pdfQ(siteSlug)}`, buildFormDataWithFile("last_page_pdf", file));
  return data;
}

export async function adminUploadThirdPagePdf(file: File, siteSlug?: string): Promise<AdminPdfSettings> {
  const { data } = await axios.patch<AdminPdfSettings>(`/api/admin/pdf-settings${_pdfQ(siteSlug)}`, buildFormDataWithFile("third_page_pdf", file));
  return data;
}

export async function adminClearPdfTemplate(which: "first" | "second" | "third" | "last", siteSlug?: string): Promise<AdminPdfSettings> {
  const key =
    which === "first"
      ? "clear_first_page_pdf"
      : which === "second"
        ? "clear_second_page_pdf"
        : which === "third"
          ? "clear_third_page_pdf"
          : "clear_last_page_pdf";
  const { data } = await axios.patch<AdminPdfSettings>(`/api/admin/pdf-settings${_pdfQ(siteSlug)}`, { [key]: true });
  return data;
}

export type AdminPdfTextItem = { key: string; value: string; is_override?: boolean };

export async function adminGetPdfTexts(siteSlug?: string): Promise<AdminPdfTextItem[]> {
  const q = siteSlug ? `?site=${encodeURIComponent(siteSlug)}` : "";
  const { data } = await axios.get<{ items: AdminPdfTextItem[] }>(`/api/admin/pdf-texts${q}`);
  return data.items;
}

export async function adminPatchPdfTexts(items: Record<string, string>, siteSlug?: string): Promise<AdminPdfTextItem[]> {
  const q = siteSlug ? `?site=${encodeURIComponent(siteSlug)}` : "";
  const { data } = await axios.patch<{ items: AdminPdfTextItem[] }>(`/api/admin/pdf-texts${q}`, items);
  return data.items;
}

export type AdminModelInfo = {
  name: string;
  table: string;
  verbose: string;
  fields: { name: string; verbose: string; type: string }[];
};

export async function adminGetModels(): Promise<AdminModelInfo[]> {
  const { data } = await axios.get<AdminModelInfo[]>("/api/admin/models");
  return data;
}

export async function adminGetModelRecords(
  modelName: string,
  limit?: number,
  offset?: number
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const { data } = await axios.get("/api/admin/models/" + encodeURIComponent(modelName), {
    params: { limit: limit ?? 50, offset: offset ?? 0 },
  });
  return data;
}

export async function adminCreateRecord(modelName: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data } = await axios.post("/api/admin/models/" + encodeURIComponent(modelName) + "/create", payload);
  return data;
}

export async function adminGetRecord(modelName: string, pk: number): Promise<Record<string, unknown>> {
  const { data } = await axios.get("/api/admin/models/" + encodeURIComponent(modelName) + "/" + pk);
  return data;
}

export async function adminUpdateRecord(
  modelName: string,
  pk: number,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { data } = await axios.put("/api/admin/models/" + encodeURIComponent(modelName) + "/" + pk, payload);
  return data;
}

export async function adminDeleteRecord(modelName: string, pk: number): Promise<void> {
  await axios.delete("/api/admin/models/" + encodeURIComponent(modelName) + "/" + pk);
}

/* -------------------- ADMIN: изображения на сервере (Drawings) -------------------- */

export type AdminDrawingsFile = {
  path: string;
  name: string;
  folder: string;
  size: number | null;
  preview_url?: string | null;
};

export async function adminDrawingsList(): Promise<AdminDrawingsFile[]> {
  const { data } = await axios.get<{ files: AdminDrawingsFile[] }>("/api/admin/drawings");
  return data.files;
}

export async function adminDrawingsUpload(
  file: File,
  folder?: string,
): Promise<{ path: string; name: string; size: number }> {
  const formData = new FormData();
  formData.append("file", file);
  if (folder && folder.trim()) {
    formData.append("folder", folder.trim());
  }
  const { data } = await axios.post<{ path: string; name: string; size: number }>(
    "/api/admin/drawings/upload",
    formData,
  );
  return data;
}

export async function adminDrawingsDelete(pathOrName: string): Promise<void> {
  await axios.delete("/api/admin/drawings/delete", { params: { path: pathOrName } });
}

/* -------------------- ADMIN: управление пользователями -------------------- */

export type UserRole = "user" | "admin";

export type AdminUserSiteVisit = {
  slug: string;
  name: string;
  last_seen: string;
  first_seen: string;
  visit_count: number;
};

export type AdminUser = {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role: UserRole;
  date_joined: string;
  last_login: string | null;
  selections_count: number;
  projects_count: number;
  /** На каких витринах (мультисайт) был замечен пользователь. Отсортировано по last_seen. */
  sites_visited?: AdminUserSiteVisit[];
};

export type AdminUserDetail = AdminUser & {
  selections: { id: number; pump_name: string; Q: number; H: number; created_at: string }[];
  projects: {
    id: number;
    name: string;
    address: string;
    /** Slug витрины проекта для брендинга (если сохранён) */
    site_slug?: string | null;
    created_at: string;
  }[];
  sites_visited?: AdminUserSiteVisit[];
};

export async function adminGetUsers(): Promise<AdminUser[]> {
  const { data } = await axios.get<AdminUser[]>("/api/admin/users");
  return data;
}

export async function adminCreateUser(payload: {
  email: string; password: string; first_name?: string; last_name?: string; role?: UserRole;
}): Promise<{ id: number; email: string }> {
  const { data } = await axios.post("/api/admin/users/create", payload);
  return data;
}

export async function adminGetUser(id: number): Promise<AdminUserDetail> {
  const { data } = await axios.get<AdminUserDetail>(`/api/admin/users/${id}`);
  return data;
}

export async function adminUpdateUser(id: number, payload: Partial<Pick<AdminUser, "email" | "first_name" | "last_name" | "is_active" | "role">>): Promise<AdminUser> {
  const { data } = await axios.patch<AdminUser>(`/api/admin/users/${id}`, payload);
  return data;
}

export async function adminDeleteUser(id: number): Promise<void> {
  await axios.delete(`/api/admin/users/${id}`);
}

export async function adminSetUserPassword(id: number, password: string): Promise<void> {
  await axios.post(`/api/admin/users/${id}/set-password`, { password });
}

/* -------------------- ADMIN: настройки Email -------------------- */

export type AdminEmailSettings = {
  EMAIL_HOST: string;
  EMAIL_PORT: string;
  EMAIL_USE_SSL: string;
  EMAIL_USE_TLS: string;
  EMAIL_HOST_USER: string;
  EMAIL_HOST_PASSWORD: string;
  DEFAULT_FROM_EMAIL: string;
};

export async function adminGetEmailSettings(): Promise<AdminEmailSettings> {
  const { data } = await axios.get<AdminEmailSettings>("/api/admin/email-settings");
  return data;
}

export async function adminPatchEmailSettings(
  payload: Partial<AdminEmailSettings> & { test_connection?: boolean }
): Promise<AdminEmailSettings & { ok: boolean; test_result?: string | null }> {
  const { data } = await axios.patch("/api/admin/email-settings", payload);
  return data;
}

/* -------------------- ADMIN: история подборов всех пользователей -------------------- */

export type AdminSelection = {
  id: number;
  user_id: number;
  username: string;
  email: string;
  Q: number;
  H: number;
  n1: number;
  n2: number;
  pump_types: string;
  pump_name: string;
  fluid_type: string;
  temperature: number;
  created_at: string;
};

export type AdminProject = {
  id: number;
  user_id: number;
  username: string;
  email: string;
  name: string;
  address: string;
  selections_count: number;
  created_at: string;
};

export type AdminStats = {
  users_total: number;
  selections_7d: number;
  projects_total: number;
  recent_selections: Array<{
    id: number;
    username: string;
    Q: number;
    H: number;
    pump_name: string;
    created_at: string | null;
  }>;
};

export async function adminGetStats(): Promise<AdminStats> {
  const { data } = await axios.get<AdminStats>("/api/admin/stats");
  return data;
}

export async function adminGetAllSelections(params?: {
  limit?: number; offset?: number; user_id?: number;
}): Promise<{ rows: AdminSelection[]; total: number }> {
  const { data } = await axios.get("/api/admin/all-selections", { params });
  return data;
}

export async function adminGetAllProjects(params?: {
  limit?: number; offset?: number; user_id?: number;
}): Promise<{ rows: AdminProject[]; total: number }> {
  const { data } = await axios.get("/api/admin/all-projects", { params });
  return data;
}

/* -------------------- ADMIN: конструктор БД (ext + проекты) -------------------- */

export type ExtDesignCoreNode = {
  id: string;
  layer: string;
  model: string;
  label: string;
  managed: boolean;
  fields: Array<{
    name: string;
    verbose: string;
    type: string;
    null: boolean;
    blank?: boolean;
    primary_key: boolean;
    unique?: boolean;
    fk_to_table?: string;
    fk_to_field?: string;
    on_delete?: string;
  }>;
};

export type ExtDesignCoreSnapshot = {
  nodes: ExtDesignCoreNode[];
  edges: Array<{ from: string; to: string; field: string; layer?: string }>;
  generated_at: string;
  etag: string;
};

export async function adminExtDesignCoreSnapshot(): Promise<ExtDesignCoreSnapshot> {
  const { data } = await axios.get<ExtDesignCoreSnapshot>("/api/admin/ext-design/core-snapshot");
  return data;
}

export type ExtDesignCatalog = {
  schema: string;
  catalog_hash?: string;
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      data_type: string;
      udt_name: string;
      nullable: boolean;
      default: string | null;
    }>;
  }>;
  foreign_keys: Array<{
    from_table: string;
    from_column: string;
    to_schema: string;
    to_table: string;
    to_column: string;
    constraint_name: string;
  }>;
  indexes?: Array<{
    name: string;
    table: string;
    definition: string;
  }>;
  unique_constraints?: Array<{
    table: string;
    name: string;
    columns: string[];
  }>;
};

export async function adminExtDesignCatalog(): Promise<ExtDesignCatalog> {
  const { data } = await axios.get<ExtDesignCatalog>("/api/admin/ext-design/catalog");
  return data;
}

export type ExtDesignPortLegacyResult = {
  overwrite: boolean;
  dest_schema?: string;
  created: Array<{ source: string; dest: string; rows: number }>;
  skipped: Array<{ source: string; dest: string; reason: string }>;
  errors: Array<{ source: string; error: string }>;
};

/** Перенос legacy-таблиц в схему ext (маршрут API сохранён для совместимости). */
export async function adminExtDesignPortLegacyTables(payload?: {
  overwrite?: boolean;
}): Promise<ExtDesignPortLegacyResult> {
  const { data } = await axios.post<ExtDesignPortLegacyResult>(
    "/api/admin/ext-design/port-django-tables",
    payload ?? {},
  );
  return data;
}

export type ExtDesignPortFullPublicResult = ExtDesignPortLegacyResult & {
  mode?: string;
};

export async function adminExtDesignPortFullPublic(payload?: {
  overwrite?: boolean;
  exclude_tables?: string[];
}): Promise<ExtDesignPortFullPublicResult> {
  const { data } = await axios.post<ExtDesignPortFullPublicResult>(
    "/api/admin/ext-design/port-full-public",
    payload ?? {},
  );
  return data;
}

export type ExtSchemaBlueprint = Record<string, unknown>;

export type ExtSchemaProjectSummary = {
  id: number;
  name: string;
  description: string;
  updated_at: string;
  revision: number;
};

export type ExtSchemaProjectDetail = ExtSchemaProjectSummary & {
  blueprint: ExtSchemaBlueprint;
  created_at: string;
};

export async function adminExtDesignProjectsList(): Promise<ExtSchemaProjectSummary[]> {
  const { data } = await axios.get<ExtSchemaProjectSummary[]>("/api/admin/ext-design/projects");
  return data;
}

/** @deprecated Создание проектов отключено на бэкенде (единый чертёж ext). Оставлено для совместимости. */
export async function adminExtDesignProjectCreate(payload: {
  name: string;
  description?: string;
  import_current_schema?: boolean;
  blueprint?: ExtSchemaBlueprint;
}): Promise<ExtSchemaProjectDetail> {
  const { data } = await axios.post<ExtSchemaProjectDetail>("/api/admin/ext-design/projects", payload);
  return data;
}

export async function adminExtDesignProjectGet(id: number): Promise<ExtSchemaProjectDetail> {
  const { data } = await axios.get<ExtSchemaProjectDetail>(`/api/admin/ext-design/projects/${id}`);
  return data;
}

export async function adminExtDesignProjectPatch(
  id: number,
  payload: Partial<{ name: string; description: string; blueprint: ExtSchemaBlueprint; expected_revision: number }>,
): Promise<ExtSchemaProjectDetail> {
  const { data } = await axios.patch<ExtSchemaProjectDetail>(`/api/admin/ext-design/projects/${id}`, payload);
  return data;
}

export async function adminExtDesignProjectDelete(id: number): Promise<void> {
  await axios.delete(`/api/admin/ext-design/projects/${id}`);
}

/** @deprecated Дублирование отключено на бэкенде. Оставлено для совместимости. */
export async function adminExtDesignProjectDuplicate(id: number): Promise<ExtSchemaProjectDetail> {
  const { data } = await axios.post<ExtSchemaProjectDetail>(`/api/admin/ext-design/projects/${id}/duplicate`);
  return data;
}

export async function adminExtDesignProjectApply(id: number): Promise<{ ok: boolean; executed: string[]; catalog_hash?: string }> {
  const { data } = await axios.post<{ ok: boolean; executed: string[]; catalog_hash?: string }>(
    `/api/admin/ext-design/projects/${id}/apply`,
  );
  return data;
}

export async function adminExtDesignValidateDependencies(
  id: number,
  payload: { table: string; column?: string | null },
): Promise<{ ok: boolean; dependencies: string[]; table: string; column: string | null }> {
  const { data } = await axios.post<{ ok: boolean; dependencies: string[]; table: string; column: string | null }>(
    `/api/admin/ext-design/projects/${id}/validate-dependencies`,
    payload,
  );
  return data;
}

export async function adminExtDesignMergeCore(id: number): Promise<ExtSchemaProjectDetail> {
  const { data } = await axios.post<ExtSchemaProjectDetail>(`/api/admin/ext-design/projects/${id}/merge-core`);
  return data;
}

export async function adminExtDesignExportCoreDraft(id: number): Promise<{
  project_id: number;
  project_name: string;
  layers_core: unknown;
}> {
  const { data } = await axios.get(`/api/admin/ext-design/projects/${id}/export-core-draft`);
  return data;
}

export async function adminExtDesignCreateTable(payload: {
  table: string;
  columns: Array<{
    name: string;
    pg_type?: string;
    type?: string;
    nullable?: boolean;
    primary_key?: boolean;
    max_length?: number;
  }>;
}): Promise<void> {
  await axios.post("/api/admin/ext-design/ext/table", payload);
}

export async function adminExtDesignDropTable(table: string, cascade?: boolean): Promise<void> {
  await axios.delete(`/api/admin/ext-design/ext/table/${encodeURIComponent(table)}`, {
    params: cascade ? { cascade: "1" } : {},
  });
}

export async function adminExtDesignAddColumn(
  table: string,
  payload: { column?: string; name?: string; pg_type?: string; type?: string; nullable?: boolean },
): Promise<void> {
  await axios.post(`/api/admin/ext-design/ext/table/${encodeURIComponent(table)}/column`, payload);
}

export async function adminExtDesignDropColumn(table: string, column: string): Promise<void> {
  await axios.delete(
    `/api/admin/ext-design/ext/table/${encodeURIComponent(table)}/column/${encodeURIComponent(column)}`,
  );
}

export async function adminExtDesignRenameColumn(
  table: string,
  column: string,
  payload: { new_column?: string; new_name?: string },
): Promise<void> {
  await axios.patch(
    `/api/admin/ext-design/ext/table/${encodeURIComponent(table)}/column/${encodeURIComponent(column)}/rename`,
    payload,
  );
}

export async function adminExtDesignAlterColumnType(
  table: string,
  column: string,
  payload: { pg_type?: string; type?: string },
): Promise<void> {
  await axios.patch(
    `/api/admin/ext-design/ext/table/${encodeURIComponent(table)}/column/${encodeURIComponent(column)}/type`,
    payload,
  );
}

export async function adminExtDesignCreateIndex(payload: {
  table: string;
  columns: string[];
  index_name?: string;
  name?: string;
  unique?: boolean;
}): Promise<void> {
  await axios.post("/api/admin/ext-design/ext/index", payload);
}

export async function adminExtDesignDropIndex(indexName: string): Promise<void> {
  await axios.delete(`/api/admin/ext-design/ext/index/${encodeURIComponent(indexName)}`);
}

export async function adminExtDesignAddFk(payload: {
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
  constraint_name?: string;
}): Promise<void> {
  await axios.post("/api/admin/ext-design/ext/foreign-key", payload);
}

export async function adminExtDesignDropConstraint(table: string, constraintName: string): Promise<void> {
  await axios.delete(`/api/admin/ext-design/ext/constraint/${encodeURIComponent(table)}`, {
    params: { name: constraintName },
  });
}

/* -------------------- ADMIN: public schema DDL (вариант A) -------------------- */

export async function adminPublicDesignCatalog(): Promise<ExtDesignCatalog> {
  const { data } = await axios.get<ExtDesignCatalog>("/api/admin/public-design/catalog");
  return data;
}

export async function adminPublicDesignCreateTable(payload: {
  table: string;
  columns: Array<{
    name: string;
    pg_type?: string;
    type?: string;
    nullable?: boolean;
    primary_key?: boolean;
    max_length?: number;
  }>;
}): Promise<void> {
  await axios.post("/api/admin/public-design/table", payload);
}

export async function adminPublicDesignDropTable(table: string, cascade?: boolean): Promise<void> {
  await axios.delete(`/api/admin/public-design/table/${encodeURIComponent(table)}`, {
    params: cascade ? { cascade: "1" } : {},
  });
}

export async function adminPublicDesignAddColumn(
  table: string,
  payload: { column?: string; name?: string; pg_type?: string; type?: string; nullable?: boolean },
): Promise<void> {
  await axios.post(`/api/admin/public-design/table/${encodeURIComponent(table)}/column`, payload);
}

export async function adminPublicDesignDropColumn(table: string, column: string): Promise<void> {
  await axios.delete(
    `/api/admin/public-design/table/${encodeURIComponent(table)}/column/${encodeURIComponent(column)}`,
  );
}

export async function adminPublicDesignRenameColumn(
  table: string,
  column: string,
  payload: { new_column?: string; new_name?: string },
): Promise<void> {
  await axios.patch(
    `/api/admin/public-design/table/${encodeURIComponent(table)}/column/${encodeURIComponent(column)}/rename`,
    payload,
  );
}

export async function adminPublicDesignAlterColumnType(
  table: string,
  column: string,
  payload: { pg_type?: string; type?: string },
): Promise<void> {
  await axios.patch(
    `/api/admin/public-design/table/${encodeURIComponent(table)}/column/${encodeURIComponent(column)}/type`,
    payload,
  );
}

export async function adminPublicDesignCreateIndex(payload: {
  table: string;
  columns: string[];
  index_name?: string;
  name?: string;
  unique?: boolean;
}): Promise<void> {
  await axios.post("/api/admin/public-design/index", payload);
}

export async function adminPublicDesignDropIndex(indexName: string): Promise<void> {
  await axios.delete(`/api/admin/public-design/index/${encodeURIComponent(indexName)}`);
}

export async function adminPublicDesignAddFk(payload: {
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
  constraint_name?: string;
}): Promise<void> {
  await axios.post("/api/admin/public-design/foreign-key", payload);
}

export async function adminPublicDesignDropConstraint(table: string, constraintName: string): Promise<void> {
  await axios.delete(`/api/admin/public-design/constraint/${encodeURIComponent(table)}`, {
    params: { name: constraintName },
  });
}

/* -------------------- ADMIN: данные таблиц ext -------------------- */

export type ExtDataTableInfo = {
  name: string;
  columns: ExtDesignCatalog["tables"][0]["columns"];
};

/** Список для вкладки «Данные БД» (/admin/public-data/tables): поле editable с бэкенда. */
export type PublicDataTableInfo = ExtDataTableInfo & { editable?: boolean };

export async function adminExtDataListTables(): Promise<ExtDataTableInfo[]> {
  const { data } = await axios.get<ExtDataTableInfo[]>("/api/admin/ext-data/tables");
  return data;
}

export async function adminExtDataRows(
  table: string,
  params?: { limit?: number; offset?: number },
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const { data } = await axios.get(`/api/admin/ext-data/${encodeURIComponent(table)}`, { params });
  return data;
}

export async function adminExtDataCreate(
  table: string,
  payload: Record<string, unknown>,
  fileRefColumns?: string[],
): Promise<Record<string, unknown>> {
  const body = { ...payload, ...(fileRefColumns?.length ? { _file_ref_columns: fileRefColumns } : {}) };
  const { data } = await axios.post(`/api/admin/ext-data/${encodeURIComponent(table)}/create`, body);
  return data;
}

export async function adminExtDataUpdate(
  table: string,
  pk: number,
  payload: Record<string, unknown>,
  fileRefColumns?: string[],
): Promise<Record<string, unknown>> {
  const body = { ...payload, ...(fileRefColumns?.length ? { _file_ref_columns: fileRefColumns } : {}) };
  const { data } = await axios.put(`/api/admin/ext-data/${encodeURIComponent(table)}/${pk}`, body);
  return data;
}

export async function adminExtDataDelete(table: string, pk: number): Promise<void> {
  await axios.delete(`/api/admin/ext-data/${encodeURIComponent(table)}/${pk}`);
}

/* -------------------- ADMIN: данные таблиц public (вариант A) -------------------- */

export async function adminPublicDataListTables(): Promise<PublicDataTableInfo[]> {
  const { data } = await axios.get<PublicDataTableInfo[]>("/api/admin/public-data/tables");
  return Array.isArray(data) ? data : [];
}

export async function adminPublicDataRows(
  table: string,
  params?: { limit?: number; offset?: number },
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const { data } = await axios.get(`/api/admin/public-data/${encodeURIComponent(table)}`, { params });
  return data;
}

export async function adminPublicDataCreate(
  table: string,
  payload: Record<string, unknown>,
  fileRefColumns?: string[],
): Promise<Record<string, unknown>> {
  const body = { ...payload, ...(fileRefColumns?.length ? { _file_ref_columns: fileRefColumns } : {}) };
  const { data } = await axios.post(`/api/admin/public-data/${encodeURIComponent(table)}/create`, body);
  return data;
}

export async function adminPublicDataUpdate(
  table: string,
  pk: number,
  payload: Record<string, unknown>,
  fileRefColumns?: string[],
): Promise<Record<string, unknown>> {
  const body = { ...payload, ...(fileRefColumns?.length ? { _file_ref_columns: fileRefColumns } : {}) };
  const { data } = await axios.put(`/api/admin/public-data/${encodeURIComponent(table)}/${pk}`, body);
  return data;
}

export async function adminPublicDataDelete(table: string, pk: number): Promise<void> {
  await axios.delete(`/api/admin/public-data/${encodeURIComponent(table)}/${pk}`);
}

/* -------------------- ADMIN: пороги подбора насосов -------------------- */

export type AdminSelectionThresholdFieldMeta = {
  key: string;
  label: string;
  type: "float" | "int" | "bool" | "str";
};

export type AdminSelectionSettingsResponse = {
  defaults: Record<string, number | boolean | string>;
  saved: Record<string, unknown>;
  effective: Record<string, number | boolean | string>;
  fields: AdminSelectionThresholdFieldMeta[];
};

export async function adminGetSelectionSettings(): Promise<AdminSelectionSettingsResponse> {
  const { data } = await axios.get<AdminSelectionSettingsResponse>("/api/admin/selection-settings");
  return data;
}

export async function adminPatchSelectionSettings(payload: {
  thresholds: Record<string, unknown>;
}): Promise<AdminSelectionSettingsResponse> {
  await ensureCsrf();
  const { data } = await axios.patch<AdminSelectionSettingsResponse>("/api/admin/selection-settings", payload);
  return data;
}

export type AdminSelectionPipelineRevision = {
  id: number;
  profile_id: number;
  profile_slug: string;
  version_no: number;
  status: "draft" | "validated" | "published" | "archived";
  snapshot: Record<string, unknown>;
  checksum: string;
  notes: string;
  created_at: string | null;
  updated_at: string | null;
  published_at: string | null;
};

export async function adminSelectionRevisionsList(params?: {
  profile_id?: number;
  status?: string;
}): Promise<{ items: AdminSelectionPipelineRevision[] }> {
  const { data } = await axios.get<{ items: AdminSelectionPipelineRevision[] }>("/api/admin/selection-revisions", { params });
  return data;
}

export async function adminSelectionRevisionGet(
  revisionId: number,
): Promise<{ revision: AdminSelectionPipelineRevision }> {
  const { data } = await axios.get<{ revision: AdminSelectionPipelineRevision }>(
    `/api/admin/selection-revisions/${revisionId}`,
  );
  return data;
}

export async function adminSelectionRevisionCreate(payload: {
  profile_id: number;
  snapshot: Record<string, unknown>;
}): Promise<{ revision: AdminSelectionPipelineRevision; warnings: string[] }> {
  await ensureCsrf();
  const { data } = await axios.post<{ revision: AdminSelectionPipelineRevision; warnings: string[] }>(
    "/api/admin/selection-revisions",
    payload,
  );
  return data;
}

export async function adminSelectionRevisionPatch(
  revisionId: number,
  payload: Partial<Pick<AdminSelectionPipelineRevision, "snapshot" | "notes" | "status">>,
): Promise<{ revision: AdminSelectionPipelineRevision }> {
  await ensureCsrf();
  const { data } = await axios.patch<{ revision: AdminSelectionPipelineRevision }>(
    `/api/admin/selection-revisions/${revisionId}`,
    payload,
  );
  return data;
}

export async function adminSelectionRevisionValidate(
  revisionId: number,
): Promise<{ ok: boolean; errors: string[]; warnings: string[]; checksum: string }> {
  await ensureCsrf();
  const { data } = await axios.post<{ ok: boolean; errors: string[]; warnings: string[]; checksum: string }>(
    `/api/admin/selection-revisions/${revisionId}/validate`,
  );
  return data;
}

export async function adminSelectionRevisionPublish(
  revisionId: number,
): Promise<{ ok: boolean; revision: AdminSelectionPipelineRevision; warnings: string[] }> {
  await ensureCsrf();
  const { data } = await axios.post<{ ok: boolean; revision: AdminSelectionPipelineRevision; warnings: string[] }>(
    `/api/admin/selection-revisions/${revisionId}/publish`,
  );
  return data;
}

export async function adminSelectionRevisionTestRun(
  revisionId: number,
  payload: { Q: number; H: number; n1: number; nasos_type?: string[] },
): Promise<{
  ok: boolean;
  rows_new: number;
  rows_legacy: number;
  names_new: string[];
  names_legacy: string[];
  missing_in_new: string[];
  extra_in_new: string[];
  traces: Array<Record<string, unknown>>;
}> {
  await ensureCsrf();
  const { data } = await axios.post(`/api/admin/selection-revisions/${revisionId}/test-run`, payload);
  return data;
}

export async function adminSelectionMigrateLegacy(): Promise<{ ok: boolean; revision: AdminSelectionPipelineRevision }> {
  await ensureCsrf();
  const { data } = await axios.post<{ ok: boolean; revision: AdminSelectionPipelineRevision }>(
    "/api/admin/selection-revisions/migrate-legacy",
  );
  return data;
}

export async function adminSelectionLegacyState(): Promise<{
  active_data_flow: { id: number; slug: string; name: string; revision: number } | null;
  selection_settings: Record<string, unknown>;
  matching_code_graph: { enabled: boolean; revision: number; graph: Record<string, unknown> };
}> {
  const { data } = await axios.get("/api/admin/selection-legacy-state");
  return data;
}

export type AdminSelectionDataSource = {
  id: number;
  key: string;
  kind: string;
  read_only: boolean;
  is_active: boolean;
  config: Record<string, unknown>;
};

export async function adminSelectionDataSources(): Promise<{ items: AdminSelectionDataSource[] }> {
  const { data } = await axios.get<{ items: AdminSelectionDataSource[] }>("/api/admin/selection-data-sources");
  return data;
}

export type AdminSelectionQuery = {
  id: number;
  data_source_id: number;
  data_source_key: string;
  key: string;
  max_rows: number;
  timeout_ms: number;
  is_active: boolean;
  parameter_schema: Record<string, unknown>;
  result_schema: Record<string, unknown>;
};

export async function adminSelectionQueries(): Promise<{ items: AdminSelectionQuery[] }> {
  const { data } = await axios.get<{ items: AdminSelectionQuery[] }>("/api/admin/selection-queries");
  return data;
}

export type AdminPdfTemplateRevision = {
  id: number;
  key: string;
  version_no: number;
  status: string;
  required_fields: string[];
  updated_at: string | null;
};

export async function adminSelectionPdfTemplates(): Promise<{ items: AdminPdfTemplateRevision[] }> {
  const { data } = await axios.get<{ items: AdminPdfTemplateRevision[] }>("/api/admin/selection-pdf-templates");
  return data;
}

export async function adminSelectionPipelineStepKinds(): Promise<{ kinds: string[] }> {
  const { data } = await axios.get<{ kinds: string[] }>("/api/admin/selection-pipeline-step-kinds");
  return data;
}

/* -------------------- ADMIN: no-code потоки обработки данных (ext) -------------------- */

export type AdminDataFlow = {
  id: number;
  slug: string;
  name: string;
  graph: Record<string, unknown>;
  revision: number;
  is_active: boolean;
  updated_at: string | null;
};

export async function adminDataFlowNodeKinds(): Promise<{ kinds: string[] }> {
  const { data } = await axios.get<{ kinds: string[] }>("/api/admin/data-flow-node-kinds");
  return data;
}

export async function adminDataFlowsList(): Promise<{ items: AdminDataFlow[] }> {
  const { data } = await axios.get<{ items: AdminDataFlow[] }>("/api/admin/data-flows");
  return data;
}

export async function adminDataFlowCreate(payload: {
  slug: string;
  name?: string;
  graph?: Record<string, unknown>;
}): Promise<{ flow: AdminDataFlow }> {
  await ensureCsrf();
  const { data } = await axios.post<{ flow: AdminDataFlow }>("/api/admin/data-flows", payload);
  return data;
}

export async function adminDataFlowGet(id: number): Promise<{ flow: AdminDataFlow }> {
  const { data } = await axios.get<{ flow: AdminDataFlow }>(`/api/admin/data-flows/${id}`);
  return data;
}

export async function adminDataFlowPatch(
  id: number,
  payload: {
    revision: number;
    name?: string;
    graph?: Record<string, unknown>;
    is_active?: boolean;
  },
): Promise<{ flow: AdminDataFlow }> {
  await ensureCsrf();
  const { data } = await axios.patch<{ flow: AdminDataFlow }>(`/api/admin/data-flows/${id}`, payload);
  return data;
}

export async function adminDataFlowValidate(
  id: number,
): Promise<{ ok: boolean; errors: string[]; warnings: string[] }> {
  await ensureCsrf();
  const { data } = await axios.post<{ ok: boolean; errors: string[]; warnings: string[] }>(
    `/api/admin/data-flows/${id}/validate`,
  );
  return data;
}

export async function adminDataFlowRun(
  id: number,
  payload?: { inputs?: Record<string, unknown>; preview_row_cap?: number },
): Promise<{
  ok: boolean;
  rows: Record<string, unknown>[];
  traces: Record<string, unknown>[];
  row_count: number;
}> {
  await ensureCsrf();
  const { data } = await axios.post(`/api/admin/data-flows/${id}/run`, payload ?? {});
  return data;
}

// ── CMS Form Config ─────────────────────────────────────────────────────────

export type StationTypeConfig = {
  code: string;
  label: string;
  management_options: string[];
  sort_order: number;
};

export type FormOptionItem = { value: string; label: string };

export type FormConfig = {
  station_types: StationTypeConfig[];
  options: Record<string, FormOptionItem[]>;
};

export async function fetchFormConfig(): Promise<FormConfig> {
  const { data } = await axios.get<FormConfig>("/api/form-config");
  return data;
}

// ── PDF Template Revisions (Admin) ──────────────────────────────────────────

export type PdfTemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type PdfTemplateRevisionSummary = {
  id: number;
  key: string;
  version_no: number;
  status: PdfTemplateStatus;
  notes: string;
  required_fields: string[];
  updated_at: string;
  created_at: string;
};

export type PdfTemplateRevisionDetail = PdfTemplateRevisionSummary & {
  snapshot: Record<string, unknown>;
};

export async function adminListPdfTemplates(): Promise<PdfTemplateRevisionSummary[]> {
  const { data } = await axios.get<PdfTemplateRevisionSummary[]>("/api/admin/pdf-templates/");
  return data;
}

export async function adminGetPdfTemplate(id: number): Promise<PdfTemplateRevisionDetail> {
  const { data } = await axios.get<PdfTemplateRevisionDetail>(`/api/admin/pdf-templates/${id}/`);
  return data;
}

export async function adminCreatePdfTemplate(payload: {
  key: string;
  notes?: string;
  snapshot?: Record<string, unknown>;
}): Promise<PdfTemplateRevisionDetail> {
  await ensureCsrf();
  const { data } = await axios.post<PdfTemplateRevisionDetail>("/api/admin/pdf-templates/", payload);
  return data;
}

export async function adminUpdatePdfTemplate(
  id: number,
  payload: { snapshot?: Record<string, unknown>; notes?: string },
): Promise<PdfTemplateRevisionDetail> {
  await ensureCsrf();
  const { data } = await axios.patch<PdfTemplateRevisionDetail>(`/api/admin/pdf-templates/${id}/`, payload);
  return data;
}

export async function adminPublishPdfTemplate(id: number): Promise<{ ok: boolean }> {
  await ensureCsrf();
  const { data } = await axios.post<{ ok: boolean }>(`/api/admin/pdf-templates/${id}/publish/`);
  return data;
}

export async function adminArchivePdfTemplate(id: number): Promise<{ ok: boolean }> {
  await ensureCsrf();
  const { data } = await axios.post<{ ok: boolean }>(`/api/admin/pdf-templates/${id}/archive/`);
  return data;
}

// ── Cabinet: selections & projects (extended) ───────────────────────────────

export async function renameSelection(id: number, name: string): Promise<{ ok: boolean; name: string }> {
  await ensureCsrf();
  const { data } = await axios.patch<{ ok: boolean; name: string }>(`/api/user/selections/${id}/rename/`, { name });
  return data;
}

export async function editProject(id: number, payload: { name?: string; address?: string }): Promise<{ ok: boolean }> {
  await ensureCsrf();
  const { data } = await axios.patch<{ ok: boolean }>(`/api/user/projects/${id}/`, payload);
  return data;
}

export async function removeSelectionFromProject(projectId: number, selectionId: number): Promise<{ ok: boolean }> {
  await ensureCsrf();
  const { data } = await axios.delete<{ ok: boolean }>(
    `/api/user/projects/${projectId}/selections/${selectionId}/`,
  );
  return data;
}


// ── Мультисайт: Sites API ────────────────────────────────────────────────────

export type SiteRecord = {
  id: number;
  slug: string;
  name: string;
  domain: string;
  pdf_template_key: string;
  is_active: boolean;
  appearance_id: number | null;
  selection_data_flow_id: number | null;
  selection_data_flow_slug: string | null;
  station_data_flow_id: number | null;
  station_data_flow_slug: string | null;
  created_at: string;
};

export async function adminListSites(): Promise<SiteRecord[]> {
  const { data } = await axios.get<SiteRecord[]>("/api/admin/sites/");
  return data;
}

export async function adminCreateSite(payload: {
  slug: string; name: string; domain?: string; pdf_template_key?: string;
}): Promise<{ id: number; slug: string }> {
  await ensureCsrf();
  const { data } = await axios.post<{ id: number; slug: string }>("/api/admin/sites/", payload);
  return data;
}

export async function adminUpdateSite(
  id: number,
  payload: Partial<{
    name: string;
    domain: string;
    pdf_template_key: string;
    is_active: boolean;
    selection_data_flow_id: number | null;
    station_data_flow_id: number | null;
  }>,
): Promise<{ ok: boolean }> {
  await ensureCsrf();
  const { data } = await axios.patch<{ ok: boolean }>(`/api/admin/sites/${id}/`, payload);
  return data;
}

export async function adminDeleteSite(id: number): Promise<{ ok: boolean }> {
  await ensureCsrf();
  const { data } = await axios.delete<{ ok: boolean }>(`/api/admin/sites/${id}/`);
  return data;
}
