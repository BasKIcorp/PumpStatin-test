import { apiFetch } from "@/api/client";

export interface CatalogItem {
  value: string;
  label: string;
}

export function fetchCatalog(source: string) {
  return apiFetch<{ source: string; items: CatalogItem[] }>(
    `/api/v1/catalog/${encodeURIComponent(source)}`,
  );
}
