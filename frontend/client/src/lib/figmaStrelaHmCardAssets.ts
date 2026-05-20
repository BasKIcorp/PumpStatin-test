/**
 * Изображения карточек линеек BPS-C.
 * Production: /selection-assets/hm-cards/{id}.png (public или VITE_STATIC_BASE_URL).
 * Dev по умолчанию — URL Figma MCP; отключить: VITE_HM_USE_FIGMA=0
 */
import type { HydromoduleLineId } from "@/lib/selectionRoute";
import { staticUrl } from "@/lib/staticBase";

const FIGMA_FALLBACK: Record<HydromoduleLineId, string> = {
  "bps-c-pro": "https://www.figma.com/api/mcp/asset/792ded7b-f69b-40a0-bc36-c1b0a4916dde",
  "bps-c-lite": "https://www.figma.com/api/mcp/asset/0a83b251-f8d7-40f3-93cc-c31cf74f7c1d",
  "bps-c-e": "https://www.figma.com/api/mcp/asset/806815e2-31ba-4159-ac0a-6e3d3491412f",
  "bps-c-mini": "https://www.figma.com/api/mcp/asset/04fe94f0-c668-4fc0-be63-d008a7573374",
  "bps-c-j": "https://www.figma.com/api/mcp/asset/9f60fb59-78b9-4196-8420-dc797c211d6b",
};

function useFigmaMcpUrls(): boolean {
  const v = import.meta.env.VITE_HM_USE_FIGMA;
  if (v === "1") return true;
  if (v === "0") return false;
  return import.meta.env.DEV;
}

export function strelaHmCardImage(id: HydromoduleLineId, serverUrl?: string | null): string {
  if (serverUrl) return serverUrl;
  if (useFigmaMcpUrls()) return FIGMA_FALLBACK[id];
  return staticUrl(`/selection-assets/hm-cards/${id}.png`);
}
