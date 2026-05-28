import type { BrandingConfig, ProfileBundle } from "@/api/config";
import { apiFetch } from "@/api/client";

export interface DemoAccount {
  username: string;
  displayName: string;
  organization?: string;
  profileId: string;
}

export interface LoginResponse {
  accessToken: string;
  user: { username: string; displayName: string; profileId: string; role?: string };
  role?: string;
  profile: ProfileBundle["profile"];
  branding: BrandingConfig;
}

export interface MeResponse {
  user: { username: string; displayName: string; profileId: string; role?: string };
  role?: string;
}

export function fetchDemoAccounts() {
  return apiFetch<{ accounts: DemoAccount[] }>("/api/v1/auth/demo-accounts");
}

export function login(username: string, password: string) {
  return apiFetch<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function fetchSession() {
  return apiFetch<ProfileBundle & { authenticated: boolean; user: unknown }>(
    "/api/v1/auth/session",
  );
}

export function fetchMe() {
  return apiFetch<MeResponse & ProfileBundle>("/api/v1/auth/me");
}
