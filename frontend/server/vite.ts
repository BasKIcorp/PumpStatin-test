import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";
import { createProxyMiddleware } from "http-proxy-middleware";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const { default: viteConfig } = await import("../vite.config");
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
    customLogger: viteLogger,
  });

  const useSqlite = process.env.USE_SQLITE !== "false";
  const backendUrl = process.env.BACKEND_API_URL?.trim() || "";
  if (!useSqlite || backendUrl) {
    app.use(
      "/api",
      createProxyMiddleware({
        target: backendUrl || "http://127.0.0.1:8000",
        changeOrigin: true,
        selfHandleResponse: false,
      }),
    );
  }

  // ✅ Vite middleware для HTML/JS/CSS
  app.use(vite.middlewares);

  // ✅ SSR fallback
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const templatePath = path.resolve(__dirname, "..", "client", "index.html");
      let template = await fs.promises.readFile(templatePath, "utf-8");

      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      const html = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

