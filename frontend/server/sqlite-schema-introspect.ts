import type Database from "better-sqlite3";
import { initDatabase, getSqlite } from "./db";

export type SqliteColumnMeta = {
  name: string;
  data_type: string;
  udt_name: string;
  nullable: boolean;
  default: string | null;
  pk: boolean;
};

export type SqliteTableMeta = {
  name: string;
  columns: SqliteColumnMeta[];
  editable: boolean;
};

export type SqliteForeignKey = {
  from_table: string;
  from_column: string;
  to_schema: string;
  to_table: string;
  to_column: string;
  constraint_name: string;
};

export type SqliteCatalog = {
  schema: string;
  tables: SqliteTableMeta[];
  foreign_keys: SqliteForeignKey[];
};

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function mapSqliteType(sqlType: string): { data_type: string; udt_name: string } {
  const t = (sqlType || "TEXT").toUpperCase();
  if (t.includes("INT")) return { data_type: "integer", udt_name: "int4" };
  if (t.includes("REAL") || t.includes("FLOA") || t.includes("DOUB"))
    return { data_type: "double precision", udt_name: "float8" };
  if (t.includes("BOOL")) return { data_type: "boolean", udt_name: "bool" };
  return { data_type: "text", udt_name: "text" };
}

/** Актуальная схема из файла SQLite (sqlite_master + PRAGMA). */
export function introspectSqliteCatalog(schemaLabel = "main"): SqliteCatalog {
  initDatabase();
  const sqlite = getSqlite();

  const tableRows = sqlite
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
    )
    .all() as { name: string }[];

  const tables: SqliteTableMeta[] = [];
  const foreign_keys: SqliteForeignKey[] = [];

  for (const { name } of tableRows) {
    const cols = sqlite
      .prepare(`PRAGMA table_info(${quoteIdent(name)})`)
      .all() as {
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }[];

    const columns: SqliteColumnMeta[] = cols.map((c) => {
      const { data_type, udt_name } = mapSqliteType(c.type);
      return {
        name: c.name,
        data_type,
        udt_name,
        nullable: c.notnull === 0,
        default: c.dflt_value,
        pk: c.pk > 0,
      };
    });

    tables.push({ name, columns, editable: true });

    const fkRows = sqlite
      .prepare(`PRAGMA foreign_key_list(${quoteIdent(name)})`)
      .all() as { table: string; from: string; to: string; id: number }[];

    for (const fk of fkRows) {
      foreign_keys.push({
        from_table: name,
        from_column: fk.from,
        to_schema: schemaLabel,
        to_table: fk.table,
        to_column: fk.to,
        constraint_name: `fk_${name}_${fk.from}_${fk.id}`,
      });
    }
  }

  return { schema: schemaLabel, tables, foreign_keys };
}

export function listSqliteTableRows(
  table: string,
  limit: number,
  offset: number,
): { rows: Record<string, unknown>[]; total: number } {
  initDatabase();
  const sqlite = getSqlite();
  const catalog = introspectSqliteCatalog();
  if (!catalog.tables.some((t) => t.name === table)) {
    return { rows: [], total: 0 };
  }

  const all = sqlite
    .prepare(`SELECT * FROM ${quoteIdent(table)}`)
    .all() as Record<string, unknown>[];

  const rows = all.map((row) => normalizeRow(table, row));
  return { rows: rows.slice(offset, offset + limit), total: rows.length };
}

function normalizeRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  if (table !== "pumps") return row;
  const out = { ...row };
  if (typeof out.payload === "string") {
    try {
      out.payload = JSON.parse(out.payload);
    } catch {
      /* keep string */
    }
  }
  return out;
}

export function primaryKeyColumn(table: string): string | null {
  const cat = introspectSqliteCatalog();
  const t = cat.tables.find((x) => x.name === table);
  if (!t) return null;
  const pkCols = t.columns.filter((c) => c.pk);
  if (pkCols.length === 1) return pkCols[0].name;
  if (table === "app_settings") return "key";
  return pkCols[0]?.name ?? null;
}
