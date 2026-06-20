import { createContext, useContext, type ReactNode } from "react";
import type { SiteConfig } from "@pumpstation/contracts";
import { resolveLandingRoute, resolvePageRoute, resolveWizardRoute } from "@pumpstation/contracts";

const SiteConfigContext = createContext<SiteConfig | null>(null);

export function SiteConfigProvider({
  site,
  children,
}: {
  site: SiteConfig;
  children: ReactNode;
}) {
  return <SiteConfigContext.Provider value={site}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig(): SiteConfig {
  const site = useContext(SiteConfigContext);
  if (!site) throw new Error("useSiteConfig must be used within SiteConfigProvider");
  return site;
}

export function useSiteConfigOptional(): SiteConfig | null {
  return useContext(SiteConfigContext);
}

export function usePageRoute(pageId: string, fallback?: string): string {
  const site = useSiteConfig();
  return resolvePageRoute(site, pageId, fallback);
}

export function useWizardRoute(fallback = "/wizard"): string {
  const site = useSiteConfigOptional();
  return site ? resolveWizardRoute(site) : fallback;
}

export function useLandingRoute(fallback = "/home"): string {
  const site = useSiteConfigOptional();
  return site ? resolveLandingRoute(site) : fallback;
}
