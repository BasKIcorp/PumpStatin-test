import { useState, useEffect } from "react";
import { Route, Switch } from "wouter";
import type { SiteConfig } from "@pumpstation/contracts";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProfileProvider } from "@/providers/ProfileProvider";
import { WizardPage } from "@/pages/WizardPage";
import { CabinetPage } from "@/pages/CabinetPage";
import { StrelaLoginPage } from "@/pages/StrelaLoginPage";
import { PageRenderer } from "@/engine/PageRenderer";
import { ADMIN_PATH_PATTERN, AdminApp } from "@/pages/admin/AdminApp";
import { fetchSiteConfig } from "@/api/config";

export default function App() {
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);

  useEffect(() => {
    fetchSiteConfig()
      .then(setSiteConfig)
      .catch((err) => {
        console.error("Failed to load site config:", err);
      });
  }, []);

  if (!siteConfig) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        Загрузка…
      </div>
    );
  }

  return (
    <Switch>
      <Route path={ADMIN_PATH_PATTERN}>
        <AdminApp />
      </Route>
      <Route path="/login" component={StrelaLoginPage} />
      <Route path="/cabinet">
        <RequireAuth>
          <ProfileProvider>
            <CabinetPage />
          </ProfileProvider>
        </RequireAuth>
      </Route>
      {siteConfig.pages.map((page) => (
        <Route key={page.id} path={page.route}>
          <RequireAuth>
            <ProfileProvider>
              {page.type === "wizard" ? (
                <WizardPage />
              ) : (
                <PageRenderer page={page} site={siteConfig} />
              )}
            </ProfileProvider>
          </RequireAuth>
        </Route>
      ))}
    </Switch>
  );
}
