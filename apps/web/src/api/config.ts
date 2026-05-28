import type { StrelaAppearance } from "@/lib/strela/appearance";

export interface BrandingConfig {
  appTitle: string;
  layoutVariant?: string;
  sidebar: { logoText: string; logoVertical: boolean };
  colors: Record<string, string>;
  fonts: { body: string; accent: string };
  assets: { logoUrl: string; favicon: string };
  copy: Record<string, string>;
  pdf?: Record<string, string>;
  appearance?: StrelaAppearance;
}

export interface ProfileBundle {
  authenticated?: boolean;
  user?: { username: string; displayName: string; profileId: string; role?: string } | null;
  profile: {
    id: string;
    displayName: string;
    theme: string;
    algorithm: string;
    database: string;
    pdfTemplate: string;
  };
  branding: BrandingConfig;
  wizard: {
    navigation: unknown;
    flows: Record<string, unknown>;
  };
}
