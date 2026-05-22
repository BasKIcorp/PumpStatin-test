/**
 * Merges color/font fields from server/defaults/appearance.json into app_settings.appearance.
 * Run on VPS: cd frontend && node ../scripts/merge-appearance-theme.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const defaultsPath = path.join(root, "frontend/server/defaults/appearance.json");
const sqlitePath =
  process.env.SQLITE_PATH || path.join(root, "data/app.sqlite");

const MERGE_KEYS = [
  "primary_color",
  "accent_color",
  "funnel_page_background_color",
  "funnel_surface_color",
  "funnel_card_media_background_color",
  "funnel_font_heading",
  "funnel_font_body",
  "funnel_text_color",
  "funnel_text_muted_color",
  "funnel_panel_header_background_color",
  "funnel_panel_header_text_color",
  "funnel_button_background_color",
  "funnel_button_text_color",
  "funnel_button_secondary_background_color",
  "funnel_button_secondary_text_color",
  "funnel_table_row_alt_background_color",
  "funnel_table_row_selected_background_color",
];

const defaults = JSON.parse(fs.readFileSync(defaultsPath, "utf8"));
const db = new Database(sqlitePath);
const row = db.prepare("SELECT value FROM app_settings WHERE key = 'appearance'").get();
if (!row) {
  console.error("No appearance row in app_settings");
  process.exit(1);
}
const cur = JSON.parse(row.value);
for (const k of MERGE_KEYS) {
  if (defaults[k] !== undefined) cur[k] = defaults[k];
}
const prev = parseInt(String(cur.appearance_version || "0"), 10);
cur.appearance_version = String(Number.isFinite(prev) ? prev + 1 : 2);
db.prepare("UPDATE app_settings SET value = ? WHERE key = 'appearance'").run(
  JSON.stringify(cur),
);
console.log("appearance theme merged, version", cur.appearance_version);
