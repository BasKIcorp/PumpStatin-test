import type {
  BuildStationRequest,
  BuildStationResponse,
  GenerateProjectPdfRequest,
  MatchPumpsRequest,
  MatchPumpsResponse,
  SelectionHistoryItem,
  SelectionProjectItem,
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

export async function getSelectionHistory(): Promise<SelectionHistoryItem[]> {
  const res = await fetch(`${API_BASE}/api/v1/selection/history`, {
    headers: {
      ...getAuthHeader(),
    },
  });
  if (!res.ok) throw new Error("Failed to load history");
  const data = (await res.json()) as { items: SelectionHistoryItem[] };
  return data.items;
}

export async function getSelectionProjects(): Promise<SelectionProjectItem[]> {
  const res = await fetch(`${API_BASE}/api/v1/selection/projects`, {
    headers: {
      ...getAuthHeader(),
    },
  });
  if (!res.ok) throw new Error("Failed to load projects");
  const data = (await res.json()) as { items: SelectionProjectItem[] };
  return data.items;
}

export async function createSelectionProject(name: string): Promise<{ id: number; name: string }> {
  const res = await fetch(`${API_BASE}/api/v1/selection/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || "Failed to create project");
  }
  return res.json();
}

export async function attachSelectionsToProject(projectId: number, selectionIds: string[]): Promise<number> {
  const res = await fetch(`${API_BASE}/api/v1/selection/projects/${projectId}/selections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ selectionIds }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || "Failed to attach selections");
  }
  const data = (await res.json()) as { attached: number };
  return data.attached;
}

export async function getProjectSelections(projectId: number): Promise<SelectionHistoryItem[]> {
  const res = await fetch(`${API_BASE}/api/v1/selection/projects/${projectId}/selections`, {
    headers: {
      ...getAuthHeader(),
    },
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || "Failed to load project selections");
  }
  const data = (await res.json()) as { items: SelectionHistoryItem[] };
  return data.items;
}

export async function generateProjectPdf(
  projectId: number,
  request: GenerateProjectPdfRequest,
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/v1/selection/projects/${projectId}/generate-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || "Failed to generate project PDF");
  }
  return res.blob();
}
