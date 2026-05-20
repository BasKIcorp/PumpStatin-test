import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { appSettings, pumps } from "@shared/schema";
import { getDb } from "./db";
import { seedDatabase } from "./seed";

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

  app.get("/api/auth/user/", (_req: Request, res: Response) => {
    res.status(401).json({ detail: "Authentication credentials were not provided." });
  });

  app.post("/api/auth/login/", (_req: Request, res: Response) => {
    res.status(401).json({ detail: "Local SQLite mode: auth disabled." });
  });

  app.post("/api/auth/logout/", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post("/api/auth/register/", (_req: Request, res: Response) => {
    res.status(501).json({ detail: "Registration is not available in SQLite mode." });
  });
}

export async function ensureSqliteReady(): Promise<void> {
  await seedDatabase(false);
}
