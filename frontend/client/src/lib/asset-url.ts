/**
 * API часто возвращает абсолютные URL через build_absolute_uri на backend
 * с внутренним host:port или схемой http при работе пользователя по https —
 * браузер тогда режет загрузку (mixed content / чужой origin).
 * Для путей приложения переводим в относительный URL текущего origin.
 */
export function normalizeUploadedAssetUrlForBrowser(url: string | null | undefined): string | null {
  if (url == null) return null;
  const s = String(url).trim();
  if (!s) return null;
  if (s.startsWith("/") && !s.startsWith("//")) return s;

  try {
    const origin =
      typeof window !== "undefined" && window.location?.origin ? window.location.origin : "http://localhost";
    const parsed = s.startsWith("//") ? new URL(`https:${s}`) : new URL(s, origin);
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (
      path.startsWith("/media/") ||
      path.startsWith("/static/") ||
      path.startsWith("/api/")
    ) {
      return path;
    }
  } catch {
    return s;
  }
  return s;
}
