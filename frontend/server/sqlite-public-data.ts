import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { defaultNewUserRole } from "@shared/admin-access-policy";
import { appSettings, pumps, users } from "@shared/schema";
import { getDb } from "./db";
import { hashPassword } from "./auth-store";
import {
  introspectSqliteCatalog,
  listSqliteTableRows,
  primaryKeyColumn,
  type SqliteCatalog,
} from "./sqlite-schema-introspect";

function catalogForApi(schema: string): SqliteCatalog & {
  catalog_hash: string;
  indexes: [];
  unique_constraints: [];
} {
  const live = introspectSqliteCatalog(schema);
  const hash = live.tables
    .map((t) => `${t.name}:${t.columns.map((c) => c.name).join(",")}`)
    .join("|");
  return {
    ...live,
    catalog_hash: hash,
    indexes: [],
    unique_constraints: [],
    tables: live.tables.map((t) => ({
      name: t.name,
      editable: t.editable,
      columns: t.columns.map((c) => ({
        name: c.name,
        data_type: c.data_type,
        udt_name: c.udt_name,
        nullable: c.nullable,
        default: c.default,
        pk: c.pk,
      })),
    })),
  };
}

function blueprintFromCatalog(cat: ReturnType<typeof catalogForApi>, layer: "public" | "ext") {
  const nodes = cat.tables.map((t) => ({
    id: t.name,
    layer,
    label: t.name,
    columns: t.columns.map((c) => ({
      name: c.name,
      pg_type: c.udt_name || c.data_type,
      nullable: c.nullable,
      primary_key: Boolean((c as { pk?: boolean }).pk),
    })),
  }));
  const edges = cat.foreign_keys.map((fk) => ({
    from: fk.from_table,
    to: fk.to_table,
    field: fk.from_column,
    layer,
    constraint_name: fk.constraint_name,
  }));
  return {
    version: 1,
    layers: {
      [layer]: { nodes, edges },
    },
  };
}

const SQLITE_VIRTUAL_PROJECT_ID = 1;

export function registerSqlitePublicDataRoutes(app: Express): void {
  app.get("/api/admin/public-data/tables", (_req: Request, res: Response) => {
    const cat = introspectSqliteCatalog("main");
    res.json(cat.tables);
  });

  app.get("/api/admin/public-data/:table", (req: Request, res: Response) => {
    const table = String(req.params.table);
    if (table === "tables") {
      return res.status(400).json({ error: "Use GET /api/admin/public-data/tables" });
    }
    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const { rows, total } = listSqliteTableRows(table, limit, offset);
    if (total === 0 && !introspectSqliteCatalog().tables.some((t) => t.name === table)) {
      return res.status(404).json({ error: "Unknown table" });
    }
    res.json({ rows, total });
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
      const row = inserted!;
      let parsed: unknown = row.payload;
      try {
        parsed = JSON.parse(row.payload);
      } catch {
        /* keep */
      }
      return res.status(201).json({ id: row.id, nasos_type: row.nasosType, payload: parsed });
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
      let parsed: unknown = row.payload;
      try {
        parsed = JSON.parse(row.payload);
      } catch {
        /* keep */
      }
      return res.json({ id: row.id, nasos_type: row.nasosType, payload: parsed });
    }
    if (table === "users") {
      const id = Number(pk);
      const patch: Partial<typeof users.$inferInsert> = {};
      if (typeof body.email === "string") patch.email = body.email.trim().toLowerCase();
      if (typeof body.username === "string") patch.username = body.username;
      if (typeof body.first_name === "string") patch.firstName = body.first_name;
      if (typeof body.last_name === "string") patch.lastName = body.last_name;
      patch.role = defaultNewUserRole(
        body.role === "admin" || body.role === "user" ? body.role : undefined,
      );
      if (typeof body.is_active === "boolean") patch.isActive = body.is_active;
      if (typeof body.password === "string" && body.password.length >= 8) {
        patch.passwordHash = hashPassword(body.password);
      }
      if (Object.keys(patch).length > 0) {
        db.update(users).set(patch).where(eq(users.id, id)).run();
      }
      const row = db.select().from(users).where(eq(users.id, id)).get();
      if (!row) return res.status(404).json({ error: "Not found" });
      return res.json({
        id: row.id,
        email: row.email,
        username: row.username,
        first_name: row.firstName,
        last_name: row.lastName,
        role: row.role,
        is_active: row.isActive,
        created_at: row.createdAt,
        last_login: row.lastLogin,
      });
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
    const pkCol = primaryKeyColumn(table);
    if (!pkCol) return res.status(404).json({ error: "Unknown table" });

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
    res.json(catalogForApi("public"));
  });

  app.get("/api/admin/ext-design/catalog", (_req, res) => {
    res.json(catalogForApi("main"));
  });

  app.get("/api/admin/ext-design/core-snapshot", (_req, res) => {
    const cat = introspectSqliteCatalog("main");
    res.json({
      tables: cat.tables.map((t) => t.name),
      foreign_keys: cat.foreign_keys,
    });
  });

  app.get("/api/admin/ext-design/projects", (_req, res) => {
    const now = new Date().toISOString();
    res.json([
      {
        id: SQLITE_VIRTUAL_PROJECT_ID,
        name: "SQLite (актуальная схема)",
        description: "Живая схема из app.sqlite",
        updated_at: now,
        revision: 1,
      },
    ]);
  });

  app.get("/api/admin/ext-design/projects/:id", (req, res) => {
    const id = Number(req.params.id);
    if (id !== SQLITE_VIRTUAL_PROJECT_ID) {
      return res.status(404).json({ error: "Project not found" });
    }
    const cat = catalogForApi("main");
    const now = new Date().toISOString();
    res.json({
      id: SQLITE_VIRTUAL_PROJECT_ID,
      name: "SQLite (актуальная схема)",
      description: "Живая схема из app.sqlite",
      updated_at: now,
      created_at: now,
      revision: 1,
      blueprint: blueprintFromCatalog(cat, "ext"),
    });
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
