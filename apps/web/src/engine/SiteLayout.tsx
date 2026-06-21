import type { ReactNode } from "react";
import { Link } from "wouter";
import type { LayoutConfig, SiteConfig } from "@pumpstation/contracts";
import type { ProfileBundle } from "@/api/config";
import { useAuthStore } from "@/stores/authStore";

/** Bundled header logo — site.yaml defaults to missing `/logo.svg`. */
const SITE_HEADER_LOGO_FALLBACK = "/assets/strela-logo.png";

/** Placeholder paths in profile YAML that are not shipped in `public/`. */
const MISSING_SITE_LOGO_PATHS = new Set([
  "/logo.svg",
  "/assets/selection-flow-header-brand.png",
]);

function resolveSiteHeaderLogoSrc(layoutSrc: string, brandingLogoUrl?: string): string {
  for (const candidate of [layoutSrc, brandingLogoUrl, SITE_HEADER_LOGO_FALLBACK]) {
    const src = candidate?.trim();
    if (src && !MISSING_SITE_LOGO_PATHS.has(src)) return src;
  }
  return SITE_HEADER_LOGO_FALLBACK;
}

interface SiteLayoutProps {
  layout: LayoutConfig;
  site?: SiteConfig;
  profile: ProfileBundle;
  children: ReactNode;
}

function SiteHeader({ layout, site, profile }: { layout: LayoutConfig; site?: SiteConfig; profile: ProfileBundle }) {
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const { header } = layout;
  const user = profile.user;
  const branding = profile.branding;
  const logoSrc = resolveSiteHeaderLogoSrc(
    header.logo.src,
    branding.assets?.logoUrl,
  );

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background px-6 shadow-sm">
      {/* Логотип */}
      <Link
        href={header.logo.link ?? "/"}
        className="flex shrink-0 items-center gap-2"
      >
        <img
          src={logoSrc}
          alt={branding.appTitle ?? "Логотип"}
          width={header.logo.width}
          height="auto"
          className="h-8 w-auto object-contain"
          decoding="async"
        />
      </Link>

      {/* Меню */}
      <nav className="hidden items-center gap-6 md:flex">
        {header.menu.map((item) => {
          const pageRoute = site?.pages.find(p => p.id === item.pageId)?.route ?? `/${item.pageId}`;
          const isLoginRoute = pageRoute.startsWith("/login");
          if (isLoginRoute || item.pageId === "login") return null;
          return (
            <Link
              key={item.pageId}
              href={pageRoute}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Кнопка логина / информация о пользователе */}
      <div className="flex items-center gap-3">
        {token && user ? (
          <>
            <Link
              href="/cabinet"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {user.displayName}
            </Link>
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = "/login";
              }}
              className="rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20"
            >
              Выйти
            </button>
          </>
        ) : header.loginButton ? (
          <Link
            href="/login"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Войти
          </Link>
        ) : null}
      </div>
    </header>
  );
}

function SiteFooter({ layout, site }: { layout: LayoutConfig; site?: SiteConfig }) {
  const { footer } = layout;

  return (
    <footer className="border-t bg-muted/30 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {footer.columns.map((col, i) => (
            <div key={i}>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => {
                  const pageRoute = site?.pages.find(p => p.id === link.pageId)?.route ?? `/${link.pageId}`;
                  return (
                    <li key={link.pageId}>
                      <Link
                        href={pageRoute}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        {footer.copyright && (
          <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
            {footer.copyright}
          </div>
        )}
      </div>
    </footer>
  );
}

/**
 * SiteLayout — базовый лейаут для CMS-страниц сайта.
 * Рендерит SiteHeader + {children} + SiteFooter.
 */
export function SiteLayout({ layout, site, profile, children }: SiteLayoutProps) {
  return (
    <div className="site-layout flex min-h-screen flex-col">
      <SiteHeader layout={layout} site={site} profile={profile} />
      <main className="flex-1">{children}</main>
      <SiteFooter layout={layout} site={site} />
    </div>
  );
}
