import { apiFetch } from "@/api/client";
import { getAuthHeader } from "@/stores/authStore";

export interface AdminMeta {
  algorithms: string[];
  databases: string[];
  pdfTemplates: string[];
  themes: string[];
  themePdfPairs: Record<string, string>;
  layoutVariants: string[];
  runtime: {
    useMockDb: boolean;
    appProfileId: string;
    profilesDir: string;
    accountsDir: string;
  };
  pdfTemplateFiles: { id: string; path: string; hasTemplate: boolean }[];
}

export interface AdminUser {
  username: string;
  displayName: string;
  organization?: string;
  profileId: string;
  role: string;
}

export interface AdminProfileRow {
  registry: Record<string, unknown>;
  profile: {
    id: string;
    displayName?: string;
    theme?: string;
    algorithm?: string;
    database?: string;
    pdfTemplate?: string;
    active?: boolean;
  };
}

export interface AdminProfileDetail {
  registry: Record<string, unknown> | null;
  profile: Record<string, unknown>;
  branding: Record<string, unknown>;
}

export interface PumpRow {
  id: string;
  product_line: string;
  name: string;
  nominal_flow: number;
  nominal_head: number;
  power_kw: number | null;
}

export interface CatalogRow {
  id: number;
  source_key: string;
  value: string;
  label: string;
}

export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
}

export function fetchAdminMeta() {
  return apiFetch<AdminMeta>("/api/v1/admin/meta");
}

export function fetchAdminUsers() {
  return apiFetch<{ users: AdminUser[] }>("/api/v1/admin/users");
}

export function createAdminUser(body: {
  username: string;
  password: string;
  displayName: string;
  profileId: string;
  organization?: string;
  role?: string;
}) {
  return apiFetch<{ user: AdminUser }>("/api/v1/admin/users", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateAdminUser(
  username: string,
  body: Partial<{
    password: string;
    displayName: string;
    profileId: string;
    organization: string;
    role: string;
  }>,
) {
  return apiFetch<{ user: AdminUser }>(`/api/v1/admin/users/${encodeURIComponent(username)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteAdminUser(username: string) {
  return apiFetch<{ ok: boolean }>(
    `/api/v1/admin/users/${encodeURIComponent(username)}`,
    { method: "DELETE" },
  );
}

export function fetchAdminProfiles() {
  return apiFetch<{ profiles: AdminProfileRow[] }>("/api/v1/admin/profiles");
}

export function fetchAdminProfileDetail(profileId: string) {
  return apiFetch<AdminProfileDetail>(`/api/v1/admin/profiles/${encodeURIComponent(profileId)}`);
}

export function updateAdminProfilePlugins(
  profileId: string,
  body: Record<string, string | boolean | undefined>,
) {
  return apiFetch<AdminProfileDetail>(
    `/api/v1/admin/profiles/${encodeURIComponent(profileId)}/plugins`,
    { method: "PUT", body: JSON.stringify(body) },
  );
}

export function updateAdminBranding(profileId: string, branding: Record<string, unknown>) {
  return apiFetch<{ branding: Record<string, unknown> }>(
    `/api/v1/admin/profiles/${encodeURIComponent(profileId)}/branding`,
    { method: "PUT", body: JSON.stringify({ branding }) },
  );
}

export function fetchProfilesList() {
  return apiFetch<{ profiles: { id: string; displayName?: string }[] }>(
    "/api/v1/admin/profiles-list",
  );
}

export function fetchDbStatus() {
  return apiFetch<{
    mode: string;
    editable: boolean;
    pumpCount?: number;
    catalogItemCount?: number;
  }>("/api/v1/admin/database/status");
}

export function fetchAdminPumps() {
  return apiFetch<{ pumps: PumpRow[] }>("/api/v1/admin/database/pumps");
}

export function saveAdminPump(body: PumpRow, isNew: boolean) {
  if (isNew) {
    return apiFetch("/api/v1/admin/database/pumps", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
  return apiFetch(`/api/v1/admin/database/pumps/${encodeURIComponent(body.id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteAdminPump(id: string) {
  return apiFetch(`/api/v1/admin/database/pumps/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function fetchAdminCatalog(sourceKey?: string) {
  const q = sourceKey ? `?source_key=${encodeURIComponent(sourceKey)}` : "";
  return apiFetch<{ items: CatalogRow[] }>(`/api/v1/admin/database/catalog${q}`);
}

export function createAdminCatalogItem(body: {
  source_key: string;
  value: string;
  label: string;
}) {
  return apiFetch("/api/v1/admin/database/catalog", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteAdminCatalogItem(id: number) {
  return apiFetch(`/api/v1/admin/database/catalog/${id}`, { method: "DELETE" });
}

export function fetchAdminSchema() {
  return apiFetch<{ tables: SchemaTable[] }>("/api/v1/admin/database/schema");
}

export function createAdminTable(body: {
  table_name: string;
  columns: Array<{ name: string; type: string; nullable: boolean; primary_key: boolean }>;
}) {
  return apiFetch<{ ok: boolean }>("/api/v1/admin/database/schema/create-table", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function alterAdminTable(body: {
  table_name: string;
  action: "add_column" | "rename_column" | "drop_column";
  column_name?: string;
  new_column_name?: string;
  column_type?: string;
  nullable?: boolean;
}) {
  return apiFetch<{ ok: boolean }>("/api/v1/admin/database/schema/alter-table", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function importAdminExcel(tableName: string, file: File) {
  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
  const form = new FormData();
  form.append("table_name", tableName);
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/v1/admin/database/import/excel`, {
    method: "POST",
    headers: {
      ...getAuthHeader(),
    },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || "Excel import failed");
  }
  return res.json() as Promise<{ inserted: number; skipped: number; errors: string[] }>;
}
