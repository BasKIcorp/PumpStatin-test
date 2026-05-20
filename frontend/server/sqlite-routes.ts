import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { appSettings, pumps, users } from "@shared/schema";
import { getDb } from "./db";
import { seedDatabase } from "./seed";
import {
  clearSessionCookie,
  createSessionForUser,
  destroySession,
  getUserFromRequest,
  hashPassword,
  loginUser,
  registerUser,
  setSessionCookie,
  userToAdminList,
  userToAuthPayload,
  verifyPassword,
} from "./auth-store";

function getSetting(key: string): unknown {
  const row = getDb().select().from(appSettings).where(eq(appSettings.key, key)).get();
  if (!row) return null;
  return JSON.parse(row.value);
}

function parseNasosTypes(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") return [raw];
  return ["CIVOS"];
}

function requireAdmin(req: Request, res: Response): typeof users.$inferSelect | null {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return user;
}

export function registerSqliteRoutes(app: Express): void {
  app.get("/api/appearance", (_req: Request, res: Response) => {
    const data = getSetting("appearance");
    if (!data) {
      return res.status(503).json({ error: "appearance not seeded" });
    }
    res.json(data);
  });

  app.get("/api/form-config", (_req: Request, res: Response) => {
    const data = getSetting("form_config");
    if (!data) {
      return res.status(503).json({ error: "form_config not seeded" });
    }
    res.json(data);
  });

  app.get("/api/pump-unit-lines", (_req: Request, res: Response) => {
    res.json([
      {
        code: "bps-w",
        label: "BPS-W",
        bullets: ["Насосные установки для водоснабжения и пожаротушения."],
        sort_order: 1,
      },
    ]);
  });

  app.get("/api/get_matching_pumps", (req: Request, res: Response) => {
    const types = parseNasosTypes(req.query.nasos_type ?? req.query.pump_type);
    const all = getDb().select().from(pumps).all();
    const matched = all
      .filter((row) => types.some((t) => row.nasosType.toUpperCase() === t.toUpperCase()))
      .map((row) => JSON.parse(row.payload));

    if (matched.length === 0) {
      return res.json(all.map((row) => JSON.parse(row.payload)));
    }
    res.json(matched);
  });

  app.get("/api/get_station_result", (_req: Request, res: Response) => {
    const data = getSetting("station_result_stub");
    if (!data) {
      return res.status(503).json({ error: "station_result not seeded" });
    }
    res.json(data);
  });

  // ── Auth ───────────────────────────────────────────────────────────────────
  app.get("/api/auth/user/", (req: Request, res: Response) => {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ detail: "Authentication credentials were not provided." });
    }
    res.json(userToAuthPayload(user));
  });

  app.post("/api/auth/login/", (req: Request, res: Response) => {
    const email = String(req.body?.email ?? "");
    const password = String(req.body?.password ?? "");
    try {
      const payload = loginUser(email, password);
      const row = getDb().select().from(users).where(eq(users.email, payload.email)).get();
      if (!row) return res.status(401).json({ detail: "Invalid credentials." });
      const token = createSessionForUser(row.id);
      setSessionCookie(res, token);
      res.json(payload);
    } catch {
      res.status(401).json({ detail: "Invalid credentials." });
    }
  });

  app.post("/api/auth/register/", (req: Request, res: Response) => {
    const email = String(req.body?.email ?? "");
    const password = String(req.body?.password ?? "");
    const name = String(req.body?.name ?? "");
    try {
      const payload = registerUser({ email, password, name });
      const row = getDb().select().from(users).where(eq(users.id, payload.id)).get();
      if (!row) return res.status(500).json({ error: "Registration failed" });
      const token = createSessionForUser(row.id);
      setSessionCookie(res, token);
      res.json(payload);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "EMAIL_EXISTS") {
        return res.status(400).json({ error: "Пользователь с таким email уже существует" });
      }
      if (code === "WEAK_PASSWORD") {
        return res.status(400).json({ error: "Пароль должен быть не короче 8 символов" });
      }
      if (code === "INVALID_EMAIL") {
        return res.status(400).json({ error: "Укажите корректный email" });
      }
      res.status(400).json({ error: "Не удалось зарегистрироваться" });
    }
  });

  app.post("/api/auth/logout/", (req: Request, res: Response) => {
    destroySession(req);
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  // ── Admin session (отдельная форма входа в /admin) ─────────────────────────
  app.post("/api/admin/login/", (req: Request, res: Response) => {
    const email = String(req.body?.email ?? req.body?.username ?? "");
    const password = String(req.body?.password ?? "");
    try {
      const payload = loginUser(email, password);
      if (payload.role !== "admin") {
        return res.status(403).json({ error: "Требуются права администратора" });
      }
      const row = getDb().select().from(users).where(eq(users.id, payload.id)).get();
      if (!row) return res.status(401).json({ error: "Invalid credentials" });
      const token = createSessionForUser(row.id);
      setSessionCookie(res, token);
      res.json({ email: payload.email });
    } catch {
      res.status(401).json({ error: "Неверный email или пароль" });
    }
  });

  app.post("/api/admin/logout/", (req: Request, res: Response) => {
    destroySession(req);
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.get("/api/admin/whoami/", (req: Request, res: Response) => {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json({ email: user.email });
  });

  // ── Admin: пользователи ────────────────────────────────────────────────────
  app.get("/api/admin/users", (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const rows = getDb().select().from(users).all();
    res.json(rows.map(userToAdminList));
  });

  app.post("/api/admin/users/create", (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const email = String(req.body?.email ?? "");
    const password = String(req.body?.password ?? "");
    const first_name = String(req.body?.first_name ?? "");
    const last_name = String(req.body?.last_name ?? "");
    const role = req.body?.role === "admin" ? "admin" : "user";
    const name = `${first_name} ${last_name}`.trim() || email;
    try {
      const payload = registerUser({ email, password, name, role });
      res.status(201).json({ id: payload.id, email: payload.email });
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "EMAIL_EXISTS") {
        return res.status(400).json({ error: "Email уже занят" });
      }
      res.status(400).json({ error: "Не удалось создать пользователя" });
    }
  });

  app.get("/api/admin/users/:id", (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const id = Number(req.params.id);
    const row = getDb().select().from(users).where(eq(users.id, id)).get();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({
      ...userToAdminList(row),
      selections: [],
      projects: [],
    });
  });

  app.patch("/api/admin/users/:id", (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const id = Number(req.params.id);
    const row = getDb().select().from(users).where(eq(users.id, id)).get();
    if (!row) return res.status(404).json({ error: "Not found" });

    const patch: Partial<typeof users.$inferInsert> = {};
    if (typeof req.body?.email === "string") patch.email = req.body.email.trim().toLowerCase();
    if (typeof req.body?.first_name === "string") patch.firstName = req.body.first_name;
    if (typeof req.body?.last_name === "string") patch.lastName = req.body.last_name;
    if (typeof req.body?.is_active === "boolean") patch.isActive = req.body.is_active;
    if (req.body?.role === "admin" || req.body?.role === "user") patch.role = req.body.role;

    if (Object.keys(patch).length > 0) {
      getDb().update(users).set(patch).where(eq(users.id, id)).run();
    }
    const updated = getDb().select().from(users).where(eq(users.id, id)).get()!;
    res.json(userToAdminList(updated));
  });

  app.delete("/api/admin/users/:id", (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const id = Number(req.params.id);
    const me = getUserFromRequest(req);
    if (me?.id === id) {
      return res.status(400).json({ error: "Нельзя удалить текущего пользователя" });
    }
    getDb().delete(users).where(eq(users.id, id)).run();
    res.status(204).send();
  });

  app.post("/api/admin/users/:id/set-password", (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const id = Number(req.params.id);
    const password = String(req.body?.password ?? "");
    if (password.length < 8) {
      return res.status(400).json({ error: "Минимум 8 символов" });
    }
    const row = getDb().select().from(users).where(eq(users.id, id)).get();
    if (!row) return res.status(404).json({ error: "Not found" });
    getDb()
      .update(users)
      .set({ passwordHash: hashPassword(password) })
      .where(eq(users.id, id))
      .run();
    res.json({ ok: true });
  });

  // Заглушки кабинета (подборы/проекты — без отдельных таблиц в MVP)
  app.get("/api/user/selections/", (req: Request, res: Response) => {
    if (!getUserFromRequest(req)) return res.status(401).json({ detail: "Unauthorized" });
    res.json([]);
  });

  app.get("/api/user/projects/", (req: Request, res: Response) => {
    if (!getUserFromRequest(req)) return res.status(401).json({ detail: "Unauthorized" });
    res.json([]);
  });

  app.post("/api/user/selections/", (req: Request, res: Response) => {
    if (!getUserFromRequest(req)) return res.status(401).json({ detail: "Unauthorized" });
    res.status(501).json({ error: "Сохранение подборов в SQLite MVP пока не реализовано" });
  });

  app.post("/api/user/projects/", (req: Request, res: Response) => {
    if (!getUserFromRequest(req)) return res.status(401).json({ detail: "Unauthorized" });
    res.status(501).json({ error: "Проекты в SQLite MVP пока не реализованы" });
  });
}

export async function ensureSqliteReady(): Promise<void> {
  await seedDatabase(false);
}
