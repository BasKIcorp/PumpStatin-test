import { useState, useEffect } from "react";
import { Route, Switch, Redirect } from "wouter";
import type { SiteConfig, PageConfig } from "@pumpstation/contracts";
import { resolveLandingRoute } from "@pumpstation/contracts";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProfileProvider } from "@/providers/ProfileProvider";
import { SiteConfigProvider } from "@/providers/SiteConfigProvider";
import { SitePage } from "@/engine/SitePage";
import { ADMIN_PATH_PATTERN, AdminApp } from "@/pages/admin/AdminApp";
import { fetchSiteConfig } from "@/api/config";

import { useAuthStore } from "@/stores/authStore";

function PageRoute({ page, site }: { page: PageConfig; site: SiteConfig }) {
  if (page.type === "auth") {
    return (
      <ProfileProvider guestOnly>
        <SitePage page={page} site={site} />
      </ProfileProvider>
    );
  }
  return (
    <RequireAuth>
      <ProfileProvider>
        <SitePage page={page} site={site} />
      </ProfileProvider>
    </RequireAuth>
  );
}

export default function App() {
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [configFailed, setConfigFailed] = useState(false);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    fetchSiteConfig()
      .then(setSiteConfig)
      .catch((err) => {
        console.error("Failed to load site config:", err);
        setConfigFailed(true);
      });
  }, [token]);

  if (!siteConfig && !configFailed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        Загрузка…
      </div>
    );
  }

  if (!siteConfig && configFailed) {
    return (
      <Switch>
        <Route path={ADMIN_PATH_PATTERN}>
          <AdminApp />
        </Route>
        <Route>
          <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-neutral-600">Не удалось загрузить конфигурацию сайта.</p>
            <p className="text-xs text-neutral-400">Проверьте, что API запущен (pnpm dev:api).</p>
          </div>
        </Route>
      </Switch>
    );
  }

  if (!siteConfig) return null;

  const landingRoute = resolveLandingRoute(siteConfig);
  const sortedPages = [...siteConfig.pages]
    .filter((p) => p.route !== "/")
    .sort((a, b) => b.route.length - a.route.length);

  return (
    <SiteConfigProvider site={siteConfig}>
      <Switch>
        <Route path={ADMIN_PATH_PATTERN}>
          <AdminApp />
        </Route>
        <Route path="/">
          <Redirect to={landingRoute} />
        </Route>
        {sortedPages.map((page) => (
          <Route key={page.id} path={page.route}>
            <PageRoute page={page} site={siteConfig} />
          </Route>
        ))}
      </Switch>
    </SiteConfigProvider>
  );
}
