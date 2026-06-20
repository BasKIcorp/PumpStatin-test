import { getAuthHeader } from "@/stores/authStore";
import type { PdfBlock } from "./PdfCanvas";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

/** POST draft template → PDF blob (admin preview) */
export async function fetchPdfPreviewBlob(
  profileId: string,
  payload: {
    templateName: string;
    mode: "auto" | "free";
    blocks: PdfBlock[];
    branding?: Record<string, unknown>;
  },
): Promise<Blob> {
  const res = await fetch(
    `${API_BASE}/api/v1/admin/profiles/${encodeURIComponent(profileId)}/pdf/preview`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        templateName: payload.templateName,
        mode: payload.mode,
        blocks: payload.blocks,
        branding: payload.branding ?? {},
        selection: {
          configuration: {
            DN: 50,
            velocity: 1.2,
            selectedPump: { name: "COMOS 15/22", nominal_flow: 15, nominal_head: 22, power_kw: 2.2 },
            bom: [{ id: "pump", label: "Насос COMOS 15/22", qty: 2 }],
          },
          DN: { DN: 50, velocity: 1.2 },
          bom: [{ id: "pump", label: "Насос COMOS 15/22", qty: 2 }],
        },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(await res.text().catch(() => res.statusText));
  }
  return res.blob();
}
