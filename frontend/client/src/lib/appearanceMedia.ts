/** Добавляет ?v= к URL медиа витрины для сброса кэша после загрузки в админке. */
export function withAppearanceCacheBust(
  url: string | null | undefined,
  version: string | null | undefined,
): string | null {
  if (!url) return null;
  if (!version) return url;
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    parsed.searchParams.set("v", version);
    return parsed.href.startsWith("http") ? parsed.href : `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}v=${encodeURIComponent(version)}`;
  }
}

/** Пробрасывает version по всем URL-полям ответа appearance. */
export function bustAppearanceMediaUrls<T extends Record<string, unknown>>(
  data: T,
  version?: string | null,
): T {
  if (!version) return data;
  const urlKeys = [
    "logo_url",
    "cp_logo_url",
    "tech_specs_logo_url",
    "funnel_sidebar_wordmark_url",
    "selection_card_caption_logo_url",
    "selection_flow_header_logo_url",
  ] as const;
  const out = { ...data } as T & Record<string, unknown>;
  for (const key of urlKeys) {
    if (typeof out[key] === "string") {
      out[key] = withAppearanceCacheBust(out[key] as string, version);
    }
  }
  if (out.hydromodule_card_urls && typeof out.hydromodule_card_urls === "object") {
    const hm = { ...(out.hydromodule_card_urls as Record<string, string | null>) };
    for (const [k, v] of Object.entries(hm)) {
      if (typeof v === "string") hm[k] = withAppearanceCacheBust(v, version);
    }
    out.hydromodule_card_urls = hm;
  }
  return out as T;
}
