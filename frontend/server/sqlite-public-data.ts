import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { appSettings, pumps, users } from "@shared/schema";
import { getDb } from "./db";
import { hashPassword } from "./auth-store";

type ColumnMeta = {
  name: string;
  data_type: string;
  udt_name: string;
  nullable: boolean;
  default: string | null;
};

type TableMeta = {
  name: string;
  columns: ColumnMeta[];
  editable: boolean;
};

const SQLITE_PUBLIC_TABLES: TableMeta[] = [
  {
    name: "pumps",
    editable: true,
    columns: [
      { name: "id", data_type: "integer", udt_name: "int4", nullable: false, default: null },
      { name: "nasos_type", data_type: "text", udt_name: "text", nullable: false, default: null },
      { name: "payload", data_type: "text", udt_name: "text", nullable: false, default: null },
    ],
  },
  {
    name: "users",
    editable: true,
    columns: [
      { name: "id", data_type: "integer", udt_name: "int4", nullable: false, default: null },
      { name: "email", data_type: "text", udt_name: "text", nullable: false, default: null },
      { name: "username", data_type: "text", udt_name: "text", nullable: false, default: null },
      { name: "first_name", data_type: "text", udt_name: "text", nullable: true, default: null },
      { name: "last_name", data_type: "text", udt_name: "text", nullable: true, default: null },
      { name: "role", data_type: "text", udt_name: "text", nullable: false, default: "'user'" },
      { name: "is_active", data_type: "boolean", udt_name: "bool", nullable: false, default: "true" },
      { name: "created_at", data_type: "text", udt_name: "text", nullable: false, default: null },
      { name: "last_login", data_type: "text", udt_name: "text", nullable: true, default: null },
    ],
  },
  {
    name: "app_settings",
    editable: true,
    columns: [
      { name: "key", data_type: "text", udt_name: "text", nullable: false, default: null },
      { name: "value", data_type: "text", udt_name: "text", nullable: false, default: null },
    ],
  },
];

const TABLE_NAMES = new Set(SQLITE_PUBLIC_TABLES.map((t) => t.name));

function tableMeta(name: string): TableMeta | undefined {
  return SQLITE_PUBLIC_TABLES.find((t) => t.name === name);
}

function pumpRow(row: typeof pumps.$inferSelect): Record<string, unknown> {
  let payload: unknown = row.payload;
  try {
    payload = JSON.parse(row.payload);
  } catch {
    /* keep string */
  }
  return { id: row.id, nasos_type: row.nasosType, payload };
}

function userRow(row: typeof users.$inferSelect): Record<string, unknown> {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    first_name: row.firstName,
    last_name: row.lastName,
    role: row.role,
    is_active: row.isActive,
    created_at: row.createdAt,
    last_login: row.lastLogin,
  };
}

function settingRow(row: typeof appSettings.$inferSelect): Record<string, unknown> {
  return { key: row.key, value: row.value };
}

function listRows(table: string): { rows: Record<string, unknown>[]; total: number } {
  const db = getDb();
  if (table === "pumps") {
    const all = db.select().from(pumps).all();
    const rows = all.map(pumpRow);
    return { rows, total: rows.length };
  }
  if (table === "users") {
    const all = db.select().from(users).all();
    const rows = all.map(userRow);
    return { rows, total: rows.length };
  }
  if (table === "app_settings") {
    const all = db.select().from(appSettings).all();
    const rows = all.map(settingRow);
    return { rows, total: rows.length };
  }
  return { rows: [], total: 0 };
}

function extDesignCatalog(schema: string) {
  return {
    schema,
    tables: SQLITE_PUBLIC_TABLES.map((t) => ({
      name: t.name,
      columns: t.columns,
    })),
    foreign_keys: [],
    indexes: [],
    unique_constraints: [],
  };
}

export function registerSqlitePublicDataRoutes(app: Express): void {
  app.get("/api/admin/public-data/tables", (_req: Request, res: Response) => {
    res.json(SQLITE_PUBLIC_TABLES);
  });

  app.get("/api/admin/public-data/:table", (req: Request, res: Response) => {
    const table = String(req.params.table);
    if (!TABLE_NAMES.has(table)) return res.status(404).json({ error: "Unknown table" });
    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const { rows, total } = listRows(table);
    res.json({ rows: rows.slice(offset, offset + limit), total });
  });

  app.post("/api/admin/public-data/:table/create", (req: Request, res: Response) => {
    const table = String(req.params.table);
    const body = req.body as Record<string, unknown>;
    const db = getDb();
    if (table === "pumps") {
      const nasos_type = String(body.nasos_type ?? "");
      const payload =
        typeof body.payload === "string" ? body.payload : JSON.stringify(body.payload ?? {});
      const inserted = db.insert(pumps).values({ nasosType: nasos_type, payload }).returning().get();
      return res.status(201).json(pumpRow(inserted!));
    }
    if (table === "users") {
      return res.status(400).json({ error: "Создание users — через /api/admin/users/create" });
    }
    if (table === "app_settings") {
      const key = String(body.key ?? "");
      const value = typeof body.value === "string" ? body.value : JSON.stringify(body.value ?? null);
      db.insert(appSettings).values({ key, value }).run();
      return res.status(201).json({ key, value });
    }
    res.status(404).json({ error: "Unknown table" });
  });

  app.put("/api/admin/public-data/:table/:pk", (req: Request, res: Response) => {
    const table = String(req.params.table);
    const pk = String(req.params.pk);
    const body = req.body as Record<string, unknown>;
    const db = getDb();
    if (table === "pumps") {
      const id = Number(pk);
      const patch: Partial<typeof pumps.$inferInsert> = {};
      if (body.nasos_type != null) patch.nasosType = String(body.nasos_type);
      if (body.payload != null) {
        patch.payload =
          typeof body.payload === "string" ? body.payload : JSON.stringify(body.payload);
      }
      if (Object.keys(patch).length > 0) {
        db.update(pumps).set(patch).where(eq(pumps.id, id)).run();
      }
      const row = db.select().from(pumps).where(eq(pumps.id, id)).get();
      if (!row) return res.status(404).json({ error: "Not found" });
      return res.json(pumpRow(row));
    }
    if (table === "users") {
      const id = Number(pk);
      const patch: Partial<typeof users.$inferInsert> = {};
      if (typeof body.email === "string") patch.email = body.email.trim().toLowerCase();
      if (typeof body.username === "string") patch.username = body.username;
      if (typeof body.first_name === "string") patch.firstName = body.first_name;
      if (typeof body.last_name === "string") patch.lastName = body.last_name;
      if (body.role === "admin" || body.role === "user") patch.role = body.role;
      if (typeof body.is_active === "boolean") patch.isActive = body.is_active;
      if (typeof body.password === "string" && body.password.length >= 8) {
        patch.passwordHash = hashPassword(body.password);
      }
      if (Object.keys(patch).length > 0) {
        db.update(users).set(patch).where(eq(users.id, id)).run();
      }
      const row = db.select().from(users).where(eq(users.id, id)).get();
      if (!row) return res.status(404).json({ error: "Not found" });
      return res.json(userRow(row));
    }
    if (table === "app_settings") {
      const key = pk;
      const value = typeof body.value === "string" ? body.value : JSON.stringify(body.value ?? null);
      db.update(appSettings).set({ value }).where(eq(appSettings.key, key)).run();
      return res.json({ key, value });
    }
    res.status(404).json({ error: "Unknown table" });
  });

  app.delete("/api/admin/public-data/:table/:pk", (req: Request, res: Response) => {
    const table = String(req.params.table);
    const pk = req.params.pk;
    const db = getDb();
    if (table === "pumps") {
      db.delete(pumps).where(eq(pumps.id, Number(pk))).run();
      return res.status(204).send();
    }
    if (table === "users") {
      db.delete(users).where(eq(users.id, Number(pk))).run();
      return res.status(204).send();
    }
    if (table === "app_settings") {
      db.delete(appSettings).where(eq(appSettings.key, String(pk))).run();
      return res.status(204).send();
    }
    res.status(404).json({ error: "Unknown table" });
  });

  app.get("/api/admin/public-design/catalog", (_req, res) => {
    res.json(extDesignCatalog("public"));
  });

  app.get("/api/admin/ext-design/catalog", (_req, res) => {
    res.json(extDesignCatalog("ext"));
  });

  app.get("/api/admin/ext-design/projects", (_req, res) => {
    res.json([]);
  });

  app.get("/api/admin/ext-design/core-snapshot", (_req, res) => {
    res.json({ tables: [], foreign_keys: [] });
  });

  app.get("/api/admin/stats", (_req, res) => {
    const db = getDb();
    res.json({
      users_count: db.select().from(users).all().length,
      selections_count: 0,
      projects_count: 0,
      pumps_count: db.select().from(pumps).all().length,
    });
  });

  app.get("/api/admin/email-settings", (_req, res) => {
    res.json({
      host: "",
      port: 587,
      use_tls: true,
      username: "",
      from_email: "",
      enabled: false,
    });
  });

  app.patch("/api/admin/email-settings", (req, res) => {
    if (req.body?.test_connection) {
      return res.json({ test_result: "SQLite: SMTP не настроен" });
    }
    res.json(req.body ?? {});
  });

  app.get("/api/admin/all-selections", (_req, res) => {
    res.json([]);
  });

  app.get("/api/admin/all-projects", (_req, res) => {
    res.json([]);
  });
}
