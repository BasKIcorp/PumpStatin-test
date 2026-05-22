import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { sessions, users } from "@shared/schema";
import { getDb } from "./db";

export const SESSION_COOKIE = "ps_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type AuthUserPayload = {
  id: number;
  email: string;
  name: string;
  role: "user" | "admin";
};

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64).toString("hex");
  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
  } catch {
    return false;
  }
}

function splitName(name: string): { first_name: string; last_name: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

export function userToAuthPayload(row: typeof users.$inferSelect): AuthUserPayload {
  const name = `${row.firstName} ${row.lastName}`.trim() || row.email;
  return {
    id: row.id,
    email: row.email,
    name,
    role: row.role === "admin" ? "admin" : "user",
  };
}

function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function setSessionCookie(res: Response, token: string): void {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`,
  );
}

export function clearSessionCookie(res: Response): void {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
}

export function getSessionToken(req: Request): string | null {
  const cookies = parseCookies(req.headers.cookie);
  const raw = cookies[SESSION_COOKIE];
  return raw?.trim() || null;
}

export function getUserFromRequest(req: Request): typeof users.$inferSelect | null {
  const token = getSessionToken(req);
  if (!token) return null;
  const now = Date.now();
  const session = getDb()
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .get();
  if (!session || session.expiresAt < now) {
    if (session) {
      getDb().delete(sessions).where(eq(sessions.token, token)).run();
    }
    return null;
  }
  const user = getDb().select().from(users).where(eq(users.id, session.userId)).get();
  if (!user || !user.isActive) return null;
  return user;
}

export function createSessionForUser(userId: number): string {
  const token = createSessionToken();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  getDb().delete(sessions).where(eq(sessions.userId, userId)).run();
  getDb().insert(sessions).values({ token, userId, expiresAt }).run();
  getDb()
    .update(users)
    .set({ lastLogin: new Date().toISOString() })
    .where(eq(users.id, userId))
    .run();
  return token;
}

export function destroySession(req: Request): void {
  const token = getSessionToken(req);
  if (!token) return;
  getDb().delete(sessions).where(eq(sessions.token, token)).run();
}

export function registerUser(input: {
  email: string;
  password: string;
  name: string;
  role?: "user" | "admin";
}): AuthUserPayload {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("INVALID_EMAIL");
  }
  if (input.password.length < 8) {
    throw new Error("WEAK_PASSWORD");
  }
  const existing = getDb().select().from(users).where(eq(users.email, email)).get();
  if (existing) throw new Error("EMAIL_EXISTS");

  const { first_name, last_name } = splitName(input.name);
  const username = email.split("@")[0] || email;
  const role = input.role === "admin" ? "admin" : "user";
  const createdAt = new Date().toISOString();

  const inserted = getDb()
    .insert(users)
    .values({
      email,
      username,
      firstName: first_name,
      lastName: last_name,
      passwordHash: hashPassword(input.password),
      role,
      isActive: true,
      createdAt,
      lastLogin: null,
    })
    .returning()
    .get();

  return userToAuthPayload(inserted);
}

export function loginUser(email: string, password: string): AuthUserPayload {
  const normalized = email.trim().toLowerCase();
  const user = getDb().select().from(users).where(eq(users.email, normalized)).get();
  if (!user || !user.isActive) throw new Error("INVALID_CREDENTIALS");
  if (!verifyPassword(password, user.passwordHash)) throw new Error("INVALID_CREDENTIALS");
  return userToAuthPayload(user);
}

export type AdminUserRow = {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role: "user" | "admin";
  date_joined: string;
  last_login: string | null;
  selections_count: number;
  projects_count: number;
  sites_visited?: [];
};

export function userToAdminList(row: typeof users.$inferSelect): AdminUserRow {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    first_name: row.firstName,
    last_name: row.lastName,
    is_active: row.isActive,
    role: row.role === "admin" ? "admin" : "user",
    date_joined: row.createdAt,
    last_login: row.lastLogin,
    selections_count: 0,
    projects_count: 0,
    sites_visited: [],
  };
}
