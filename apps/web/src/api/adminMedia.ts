import { getAuthHeader } from "@/stores/authStore";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export interface UploadMediaResponse {
  filename: string;
  url: string;
  size: number;
}

export async function uploadProfileMedia(
  profileId: string,
  file: File,
): Promise<UploadMediaResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(
    `${API_BASE}/api/v1/admin/profiles/${encodeURIComponent(profileId)}/media/upload`,
    {
      method: "POST",
      headers: {
        ...getAuthHeader(),
      },
      body: form,
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }

  return res.json() as Promise<UploadMediaResponse>;
}
