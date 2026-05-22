import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { eq } from "drizzle-orm";
import { appSettings, pumps, users } from "@shared/schema";
import { hashPassword } from "./auth-store";
import { getDb, getSqlitePath, initDatabase } from "./db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readDefault<T>(name: string): T {
  const raw = fs.readFileSync(path.join(__dirname, "defaults", name), "utf-8");
  return JSON.parse(raw) as T;
}

const DEMO_PUMPS: Array<{ nasos_type: string; payload: object }> = [
  {
    nasos_type: "CIVOS",
    payload: {
      id: 1,
      naimenovanie: "CIVOS 32-6 (демо)",
      Q_base: 15,
      H_base: 22,
      curve: [
        { Q: 0, H: 24 },
        { Q: 10, H: 20 },
        { Q: 20, H: 14 },
        { Q: 30, H: 6 },
      ],
      parabola: [
        { Q: 0, H: 20 },
        { Q: 20, H: 20 },
      ],
      parabola_intersection: { Q: 15, H: 20 },
      eta_at_parabola: 72,
      moschnost: 2.2,
    },
  },
  {
    nasos_type: "COMOS",
    payload: {
      id: 2,
      naimenovanie: "COMOS 40-8 (демо)",
      Q_base: 18,
      H_base: 24,
      curve: [
        { Q: 0, H: 26 },
        { Q: 12, H: 22 },
        { Q: 24, H: 16 },
      ],
      parabola: [
        { Q: 0, H: 20 },
        { Q: 20, H: 20 },
      ],
      parabola_intersection: { Q: 15, H: 20 },
      eta_at_parabola: 70,
      moschnost: 3.1,
    },
  },
  {
    nasos_type: "VMIP",
    payload: {
      id: 3,
      naimenovanie: "VMIP 50-10 (демо)",
      Q_base: 20,
      H_base: 26,
      curve: [
        { Q: 0, H: 28 },
        { Q: 15, H: 22 },
        { Q: 30, H: 14 },
      ],
      parabola: [
        { Q: 0, H: 20 },
        { Q: 20, H: 20 },
      ],
      parabola_intersection: { Q: 15, H: 20 },
      eta_at_parabola: 68,
      moschnost: 4.0,
    },
  },
  {
    nasos_type: "HMIP",
    payload: {
      id: 4,
      naimenovanie: "HMIP 65-12 (демо)",
      Q_base: 22,
      H_base: 28,
      curve: [
        { Q: 0, H: 30 },
        { Q: 18, H: 24 },
        { Q: 36, H: 16 },
      ],
      parabola: [
        { Q: 0, H: 20 },
        { Q: 20, H: 20 },
      ],
      parabola_intersection: { Q: 15, H: 20 },
      eta_at_parabola: 65,
      moschnost: 5.5,
    },
  },
];

const STATION_RESULT_STUB = {
  station_name: "Демо-станция BPS-C Pro",
  pumps: "CIVOS 32-6",
  control: "Частотное",
  options: {
    Фильтр: "присутствует",
    Кожух: "присутствует",
    "Предохранительный клапан": "отсутствует",
    Виброкомпенсаторы: "присутствует",
    Виброопоры: "присутствует",
    "Буферный бак": "отсутствует",
    "Расширительный бак": "отсутствует",
    "Материал коллектора": "сталь",
    Изоляция: "отсутствует",
  },
  estimated_price: 1250000,
  price: 1250000,
  weight: 420,
  name: "Насосная установка (демо)",
  code: "DEMO-001",
  length: 1200,
  width: 800,
  height: 1100,
};

export async function seedDatabase(force = false): Promise<void> {
  initDatabase();
  const db = getDb();

  const existingAppearance = db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, "appearance"))
    .get();

  seedDefaultUsers(force);

  if (existingAppearance && !force) {
    const pumpCount = db.select().from(pumps).all().length;
    if (pumpCount === 0) {
      for (const p of DEMO_PUMPS) {
        db.insert(pumps)
          .values({
            nasosType: p.nasos_type,
            payload: JSON.stringify(p.payload),
          })
          .run();
      }
      console.log(`SQLite: demo pumps added (${getSqlitePath()}), settings kept`);
    }
    return;
  }

  const appearance = readDefault<Record<string, unknown>>("appearance.json");
  const formConfig = readDefault<Record<string, unknown>>("form-config.json");

  for (const row of [
    { key: "appearance", value: JSON.stringify(appearance) },
    { key: "form_config", value: JSON.stringify(formConfig) },
    { key: "station_result_stub", value: JSON.stringify(STATION_RESULT_STUB) },
  ]) {
    db.delete(appSettings).where(eq(appSettings.key, row.key)).run();
    db.insert(appSettings).values(row).run();
  }

  db.delete(pumps).run();
  for (const p of DEMO_PUMPS) {
    db.insert(pumps)
      .values({
        nasosType: p.nasos_type,
        payload: JSON.stringify(p.payload),
      })
      .run();
  }

  console.log(`SQLite seeded: ${getSqlitePath()}`);
}

const DEFAULT_ADMIN_EMAIL = "admin@strela.local";
const DEFAULT_ADMIN_PASSWORD = "admin12345";

function seedDefaultUsers(force: boolean): void {
  const db = getDb();
  const existingAdmin = db
    .select()
    .from(users)
    .where(eq(users.email, DEFAULT_ADMIN_EMAIL))
    .get();

  if (existingAdmin && !force) return;

  if (existingAdmin && force) {
    db.delete(users).where(eq(users.email, DEFAULT_ADMIN_EMAIL)).run();
  }

  const createdAt = new Date().toISOString();
  db.insert(users)
    .values({
      email: DEFAULT_ADMIN_EMAIL,
      username: "admin",
      firstName: "Администратор",
      lastName: "Системы",
      passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
      role: "admin",
      isActive: true,
      createdAt,
      lastLogin: null,
    })
    .run();

  console.log(`Default admin: ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD}`);
}

const isSeedCli = process.argv[1]?.replace(/\\/g, "/").endsWith("server/seed.ts");
if (isSeedCli) {
  const force = process.argv.includes("--force");
  void seedDatabase(force);
}
