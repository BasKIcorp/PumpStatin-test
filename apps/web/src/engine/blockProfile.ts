import type { SiteConfig } from "@pumpstation/contracts";
import type { ProfileBundle } from "@/api/config";

/** Единый объект profile для всех Block-компонентов (live + studio) */
export function blockProfileProps(
  profile: ProfileBundle,
  opts?: { site?: SiteConfig; profileId?: string },
): Record<string, unknown> {
  return {
    ...profile,
    site: opts?.site,
    profileId: opts?.profileId,
  };
}
