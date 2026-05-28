import type {
  BuildStationRequest,
  BuildStationResponse,
  MatchPumpsRequest,
  MatchPumpsResponse,
} from "@pumpstation/contracts";
import { getAuthHeader } from "@/stores/authStore";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1/selection/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || res.statusText);
  }
  return res.json();
}

export const matchPumps = (req: MatchPumpsRequest) =>
  post<MatchPumpsResponse>("match-pumps", req);

export const buildStation = (req: BuildStationRequest) =>
  post<BuildStationResponse>("build-station", req);

export const generatePdf = async (
  selectionId: string,
  docType: "selection" | "tkp" | "techsheet" = "selection",
): Promise<Blob> => {
  const res = await fetch(`${API_BASE}/api/v1/selection/generate-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ selectionId, docType }),
  });
  if (!res.ok) throw new Error("PDF generation failed");
  return res.blob();
};
