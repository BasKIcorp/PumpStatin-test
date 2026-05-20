/**
 * Базовый URL внешней статики (шрифты, selection-assets, hm-cards).
 * В .env: VITE_STATIC_BASE_URL=http://159.194.215.53/pump-station-static (без завершающего /)
 * Пусто — относительные пути с того же origin, что и приложение.
 */
const raw = typeof import.meta.env.VITE_STATIC_BASE_URL === "string" ? import.meta.env.VITE_STATIC_BASE_URL.trim() : "";

export const STATIC_BASE_URL = raw.replace(/\/$/, "");

export function staticUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return STATIC_BASE_URL ? `${STATIC_BASE_URL}${p}` : p;
}
