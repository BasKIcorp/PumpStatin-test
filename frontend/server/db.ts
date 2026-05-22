import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveSqlitePath(): string {
  const configured = process.env.SQLITE_PATH?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(path.join(__dirname, ".."), configured);
  }
  return path.resolve(path.join(__dirname, "..", "data", "app.sqlite"));
}

let sqlite: Database.Database | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getSqlitePath(): string {
  return resolveSqlitePath();
}

export function getDb() {
  if (!db) {
    throw new Error("SQLite database is not initialized. Call initDatabase() first.");
  }
  return db;
}

export function getSqlite(): Database.Database {
  initDatabase();
  if (!sqlite) {
    throw new Error("SQLite database is not initialized. Call initDatabase() first.");
  }
  return sqlite;
}

export function initDatabase(): void {
  if (db) return;

  const sqlitePath = resolveSqlitePath();
  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });

  sqlite = new Database(sqlitePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  db = drizzle(sqlite, { schema });

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pumps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nasos_type TEXT NOT NULL,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      last_login TEXT
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
  `);

  migrateLegacyUsersTable(sqlite);
}

function migrateLegacyUsersTable(sqlite: Database.Database): void {
  const cols = sqlite.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (cols.length === 0) return;
  const hasEmail = cols.some((c) => c.name === "email");
  if (hasEmail) return;

  const hasPassword = cols.some((c) => c.name === "password");
  if (!hasPassword) return;

  sqlite.exec(`
    CREATE TABLE users_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      last_login TEXT
    );
  `);

  const legacy = sqlite.prepare("SELECT id, username, password FROM users").all() as {
    id: number;
    username: string;
    password: string;
  }[];

  const insert = sqlite.prepare(`
    INSERT INTO users_v2 (email, username, first_name, last_name, password_hash, role, is_active, created_at)
    VALUES (?, ?, '', '', ?, 'user', 1, ?)
  `);

  const now = new Date().toISOString();
  for (const row of legacy) {
    const un = String(row.username || "").trim();
    const email = un.includes("@") ? un.toLowerCase() : `${un || "user"}@local`.toLowerCase();
    insert.run(email, un || email.split("@")[0], row.password, now);
  }

  sqlite.exec("DROP TABLE users; ALTER TABLE users_v2 RENAME TO users;");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
  `);
}
