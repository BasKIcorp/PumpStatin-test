import React, { createContext, useContext, useEffect, useMemo } from "react";
import axios from "./csrf";
import { useLocation } from "wouter";
import { applyFunnelTheme } from "./funnelTheme";

let _lastAppearanceSlug = "";

/**
 * Контекст текущей витрины (мультисайт на одном домене).
 *
 * Slug сайта определяется первым сегментом URL: `/strela/...` → "strela".
 * Технические разделы (`/login`, `/account`, `/api`, …) к сайту не относятся —
 * в них используется DEFAULT_SITE_SLUG.
 *
 * Slug пробрасывается на backend через заголовок `X-Site-Slug` на каждом axios-запросе.
 */

export const DEFAULT_SITE_SLUG = "default";

/** Последняя витрина с путями вида `/{slug}` (не затирается на `/account` и т.п.). */
export const LS_PREF_SITE_SLUG = "pump_pref_site_slug";

const RESERVED_PREFIXES = new Set([
  "",
  "login",
  "register",
  "account",
  "app-admin",
  "logout",
  "auth",
  "api",
  "media",
  "static",
  "assets",
]);

type SiteCtx = { slug: string };

const Ctx = createContext<SiteCtx>({ slug: DEFAULT_SITE_SLUG });

function extractSlug(pathname: string): string {
  if (!pathname) return DEFAULT_SITE_SLUG;
  const parts = pathname.split("/").filter(Boolean);
  const first = (parts[0] || "").toLowerCase();
  if (!first || RESERVED_PREFIXES.has(first)) return DEFAULT_SITE_SLUG;
  if (!/^[a-z0-9_-]+$/.test(first)) return DEFAULT_SITE_SLUG;
  return first;
}

/** Путь без slug витрины в URL: `/`, `/account`, `/login` — не `/test/...`. */
export function pathUsesPreferredSiteSlug(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return false;
  const first = parts[0].toLowerCase();
  return RESERVED_PREFIXES.has(first);
}

/**
 * Slug для API и темы.
 * Явная витрина в URL (`/test/...`) — её slug.
 * Корень `/` и `/default/...` — всегда `default`, без подмены из localStorage.
 * Только `/account`, `/login` и т.п. — последняя витрина из localStorage.
 */
export function resolveSiteSlugForApi(pathSlug: string, pathname = ""): string {
  if (pathSlug !== DEFAULT_SITE_SLUG) return pathSlug;
  if (pathUsesPreferredSiteSlug(pathname)) {
    return readPreferredSiteSlugFromStorage() ?? DEFAULT_SITE_SLUG;
  }
  return DEFAULT_SITE_SLUG;
}

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const slug = useMemo(() => extractSlug(location), [location]);

  const apiSlug = useMemo(() => resolveSiteSlugForApi(slug, location), [slug, location]);

  useEffect(() => {
    axios.defaults.headers.common["X-Site-Slug"] = apiSlug;
  }, [apiSlug]);

  // Загружаем appearance и применяем тему при смене витрины (единственный источник до загрузки Home).
  useEffect(() => {
    if (_lastAppearanceSlug === apiSlug) return;
    _lastAppearanceSlug = apiSlug;
    let cancelled = false;
    axios
      .get("/api/appearance")
      .then((res) => {
        if (!cancelled) applyFunnelTheme(res.data);
      })
      .catch(() => {/* ignore — дефолтные CSS-переменные останутся */});
    return () => {
      cancelled = true;
    };
  }, [apiSlug]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const s = extractSlug(location);
      if (s !== DEFAULT_SITE_SLUG) {
        window.localStorage.setItem(LS_PREF_SITE_SLUG, s);
      }
    } catch {
      /* ignore */
    }
  }, [location]);

  return <Ctx.Provider value={{ slug }}>{children}</Ctx.Provider>;
}

export function useSiteSlug(): string {
  return useContext(Ctx).slug;
}

/** Slug для API (localStorage только на /account, /login и т.п.). */
export function useApiSiteSlug(): string {
  const slug = useSiteSlug();
  const [location] = useLocation();
  return useMemo(() => resolveSiteSlugForApi(slug, location), [slug, location]);
}

/** Базовый путь витрины: `/` для default, иначе `/{slug}`. */
export function pathForSiteBase(siteSlug: string | null | undefined): string {
  if (!siteSlug || siteSlug === DEFAULT_SITE_SLUG) return "/";
  return `/${siteSlug}`;
}

/** Slug из localStorage (последняя нетехническая витрина в URL). */
export function readPreferredSiteSlugFromStorage(): string | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(LS_PREF_SITE_SLUG);
    if (!raw || !/^[a-z0-9_-]+$/.test(raw)) return null;
    if (raw === DEFAULT_SITE_SLUG) return null;
    return raw;
  } catch {
    return null;
  }
}

/** Ссылка «продолжить подбор» с учётом витрины проекта. */
export function hrefResumeSelection(
  siteSlug: string | null | undefined,
  s: { Q: number; H: number; n1: number; n2: number; fluid_type?: string },
): string {
  const base = pathForSiteBase(siteSlug);
  const q = `Q=${s.Q}&H=${s.H}&n1=${s.n1}&n2=${s.n2}&fluid=${encodeURIComponent(s.fluid_type || "")}`;
  return base === "/" ? `/?${q}` : `${base}?${q}`;
}

export function isReservedPrefix(segment: string): boolean {
  return RESERVED_PREFIXES.has((segment || "").toLowerCase());
}
