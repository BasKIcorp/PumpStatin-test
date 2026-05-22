import { defineConfig } from "drizzle-kit";

const sqlitePath = process.env.SQLITE_PATH || "./data/app.sqlite";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: sqlitePath,
  },
});
