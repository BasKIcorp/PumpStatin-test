import axios from "axios";

/** Вытягивает текст из тела ответа DRF/нашего API. */
function messageFromResponseData(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === "string") {
    const t = data.trim();
    if (!t) return null;
    const head = t.slice(0, 80).trimStart().toLowerCase();
    if (head.startsWith("<!doctype") || head.startsWith("<html")) {
      return "сервер вернул HTML-страницу вместо JSON (прокси, 500 Django или не тот URL)";
    }
    return t.length > 400 ? `${t.slice(0, 397)}…` : t;
  }
  if (typeof data !== "object") return String(data);

  const o = data as Record<string, unknown>;

  if (typeof o.error === "string") return o.error;
  if (typeof o.message === "string") return o.message;

  const detail = o.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const s = detail.map((x) => String(x)).filter(Boolean).join("; ");
    return s || null;
  }

  const parts: string[] = [];
  for (const [k, v] of Object.entries(o)) {
    if (v == null || k === "detail") continue;
    if (Array.isArray(v)) parts.push(`${k}: ${v.map(String).join(", ")}`);
    else if (typeof v === "string") parts.push(`${k}: ${v}`);
  }
  if (parts.length) return parts.slice(0, 6).join("; ") + (parts.length > 6 ? " …" : "");

  try {
    const s = JSON.stringify(data);
    return s.length > 400 ? `${s.slice(0, 397)}…` : s;
  } catch {
    return null;
  }
}

const MAX_DESC = 600;

/**
 * Человекочитаемое описание ошибки запроса (axios / Error / неизвестное).
 * Использовать во всплывающих сообщениях вместо голого «Ошибка».
 */
export function formatApiError(error: unknown, fallback = "Не удалось выполнить запрос"): string {
  if (axios.isAxiosError(error)) {
    const st = error.response?.status;
    const fromBody = messageFromResponseData(error.response?.data);
    const prefix = st != null ? `HTTP ${st}` : null;

    // Сеть / таймаут без тела ответа
    if (!error.response && error.message) {
      const chunk = prefix ? `${prefix}: ${error.message}` : error.message;
      return chunk.length > MAX_DESC ? chunk.slice(0, MAX_DESC) + "…" : chunk;
    }

    if (fromBody) {
      const chunk = prefix ? `${prefix}: ${fromBody}` : fromBody;
      return chunk.length > MAX_DESC ? chunk.slice(0, MAX_DESC) + "…" : chunk;
    }

    const bare = prefix || error.message || fallback;
    return bare.length > MAX_DESC ? bare.slice(0, MAX_DESC) + "…" : bare;
  }

  if (error instanceof Error && error.message) {
    const m = error.message;
    return m.length > MAX_DESC ? m.slice(0, MAX_DESC) + "…" : m;
  }

  const s = String(error);
  if (s && s !== "[object Object]") {
    return s.length > MAX_DESC ? s.slice(0, MAX_DESC) + "…" : s;
  }
  return fallback;
}
