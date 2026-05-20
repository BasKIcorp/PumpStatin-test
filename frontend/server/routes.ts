import type { Express } from "express";
import { createServer, type Server } from "http";
import axios from "axios";
import FormData from "form-data";
import { createProxyMiddleware } from "http-proxy-middleware";
import { storage } from "./storage";

// Simple CSRF token storage (in production, use Redis or database)
const csrfTokens = new Set<string>();

// Для локальной разработки используем localhost, для продакшена - VPS
const API_BASE_URL =
  process.env.BACKEND_API_URL ||
  process.env.DJANGO_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "http://localhost:8000"
    : "http://127.0.0.1:8000");

/** Понятное сообщение вместо сырого «Proxy error», если API не слушает порт. */
function describeProxyFailure(error: unknown): { status: number; message: string } {
  if (axios.isAxiosError(error)) {
    const code = error.code;
    if (code === "ECONNREFUSED" || code === "EHOSTUNREACH") {
      return {
        status: 503,
        message:
          `Сервер API не отвечает (${API_BASE_URL}). Запустите backend на порту 8000.`,
      };
    }
    if (code === "ETIMEDOUT") {
      return { status: 504, message: "Таймаут при подключении к API." };
    }
    if (code === "ENOTFOUND") {
      return {
        status: 503,
        message: "Неверный адрес API (проверьте переменную BACKEND_API_URL).",
      };
    }
    if (!error.response) {
      return {
        status: 503,
        message: "Не удалось связаться с API. Убедитесь, что backend запущен.",
      };
    }
  }
  return { status: 500, message: "Внутренняя ошибка при обращении к API." };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Медиа API (изображения типов насосов, логотипы): абсолютные URL с 127.0.0.1 не открываются в браузере
  app.use(
    "/media",
    createProxyMiddleware({
      target: API_BASE_URL,
      changeOrigin: true,
    }),
  );

  // ✅ CSRF token endpoint
  app.get("/api/csrf-token", (req, res) => {
    // Generate CSRF token (you might want to use a proper CSRF library)
    const csrfToken = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    
    csrfTokens.add(csrfToken);
    res.json({ csrfToken });
  });

  // CSRF endpoint proxy
  app.get("/api/csrf/", async (req, res) => {
    try {
      console.log(`🔐 CSRF от API: ${API_BASE_URL}/api/csrf/`);
      const response = await axios.get(`${API_BASE_URL}/api/csrf/`, {
        withCredentials: true,
        headers: {
          'Cookie': req.headers.cookie || ''
        }
      });
      
      console.log('✅ CSRF ответ от API:', {
        status: response.status,
        headers: Object.keys(response.headers),
        data: response.data
      });
      
      let csrfToken = null;
      
      // Сначала пытаемся получить токен из тела ответа (JSON)
      if (response.data && (response.data.csrfToken || response.data.csrf)) {
        csrfToken = response.data.csrfToken || response.data.csrf;
        console.log('🔍 CSRF токен получен из JSON ответа:', csrfToken);
      }
      
      // Если токена нет в JSON, пытаемся извлечь из Set-Cookie заголовка
      if (!csrfToken) {
        const setCookieHeader = response.headers['set-cookie'];
        if (setCookieHeader) {
          // Ищем csrftoken в Set-Cookie заголовке
          for (const cookie of Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]) {
            const match = cookie.match(/csrftoken=([^;]+)/);
            if (match) {
              csrfToken = match[1];
              console.log('🔍 CSRF токен извлечен из cookie:', csrfToken);
              break;
            }
          }
        }
      }
      
      if (csrfToken) {
        // Передаем Set-Cookie заголовок клиенту (если есть)
        const setCookieHeader = response.headers['set-cookie'];
        if (setCookieHeader) {
          res.setHeader('Set-Cookie', setCookieHeader);
        }
        
        return res.status(200).json({ 
          csrfToken: csrfToken,
          csrf: csrfToken  // Дублируем для совместимости
        });
      } else {
        console.log('⚠️ CSRF токен не найден ни в JSON, ни в cookie');
        throw new Error('CSRF token not found in response');
      }
    } catch (error: any) {
      console.error("❌ Ошибка получения CSRF токена от API:", error.message || error);
      
      // Fallback: генерируем собственный CSRF токен для локальной разработки
      console.log('🔄 Используем fallback CSRF токен для локальной разработки');
      const fallbackToken = Math.random().toString(36).substring(2, 15) + 
                           Math.random().toString(36).substring(2, 15);
      
      // Сохраняем токен в нашем хранилище
      csrfTokens.add(fallbackToken);
      console.log('💾 Fallback токен сохранен:', fallbackToken);
      
      return res.status(200).json({ 
        csrfToken: fallbackToken,
        csrf: fallbackToken  // Дублируем для совместимости
      });
    }
  });

  // ✅ CSRF middleware for POST requests (ВРЕМЕННО ОТКЛЮЧЕН)
  const csrfMiddleware = (req: any, res: any, next: any) => {
    // Временно пропускаем все запросы
    console.log('🔐 CSRF middleware пропущен для:', req.url);
    return next();
    
    // Оригинальная логика (закомментирована)
    /*
    if (req.method === 'GET' || req.url?.includes('/csrf-token') || req.url?.includes('/csrf/')) {
      return next();
    }

    const token = req.headers['x-csrf-token'];
    console.log('🔐 Проверяем CSRF токен:', token);
    console.log('🔐 Доступные токены:', Array.from(csrfTokens));
    
    if (!token || !csrfTokens.has(token)) {
      console.error('❌ CSRF токен не найден или неверный');
      return res.status(403).json({ 
        error: 'CSRF token mismatch',
        details: 'Invalid or missing CSRF token' 
      });
    }

    // Remove used token (one-time use)
    csrfTokens.delete(token);
    console.log('✅ CSRF токен валиден, продолжаем');
    next();
    */
  };

  // ✅ API proxy route for getting matching pumps
  app.get("/api/get_matching_pumps", async (req, res) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/get_matching_pumps`, {
        params: req.query,  // ← передаём все параметры
      });

      return res.status(200).json(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return res.status(error.response.status).json(error.response.data);
      } else {
        console.error("Error fetching matching pumps:", error);
        return res.status(500).json({
          error: "Failed to fetch matching pumps",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    }
  });
    // ✅ API proxy route for downloading PDF (GET)
  app.get("/api/download_station_pdf", async (req, res) => {
    try {
      const axiosResp = await axios.get(`${API_BASE_URL}/api/download_station_pdf`, {
        params: req.query,
        responseType: "arraybuffer",
      });

      res.setHeader("Content-Type", axiosResp.headers["content-type"] || "application/pdf");
      if (axiosResp.headers["content-disposition"]) {
        res.setHeader("Content-Disposition", axiosResp.headers["content-disposition"]);
      }

      return res.status(axiosResp.status).send(Buffer.from(axiosResp.data));
    } catch (error) {
      console.error("❌ Error proxying PDF:", error);
      return res.status(500).json({ error: "Proxy error" });
    }
  });

  // ✅ API proxy route for downloading PDF (POST with JSON body containing graphs_image)
  app.post("/api/download_station_pdf", async (req, res) => {
    try {
      // FormData для передачи на API (multipart/form-data)
      const formData = new FormData();
      
      // Добавляем все параметры из req.body (кроме graphs_image)
      Object.keys(req.body).forEach(key => {
        if (key !== 'graphs_image') {
          formData.append(key, String(req.body[key]));
        }
      });
      
      // Добавляем graphs_image если есть (как файл из base64)
      if (req.body.graphs_image) {
        // Преобразуем base64 строку в Buffer
        const imageBuffer = Buffer.from(req.body.graphs_image, 'base64');
        formData.append('graphs_image', imageBuffer, {
          filename: 'graphs.png',
          contentType: 'image/png'
        });
        console.log(`📸 Передаем изображение графиков на API, размер: ${imageBuffer.length} байт`);
      }

      const axiosResp = await axios.post(`${API_BASE_URL}/api/download_station_pdf`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: "arraybuffer",
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      res.setHeader("Content-Type", axiosResp.headers["content-type"] || "application/pdf");
      if (axiosResp.headers["content-disposition"]) {
        res.setHeader("Content-Disposition", axiosResp.headers["content-disposition"]);
      }

      return res.status(axiosResp.status).send(Buffer.from(axiosResp.data));
    } catch (error) {
      console.error("❌ Error proxying PDF:", error);
      return res.status(500).json({ error: "Proxy error" });
    }
  });

  app.get("/api/download_tech_sheet_pdf", async (req, res) => {
    try {
      const axiosResp = await axios.get(`${API_BASE_URL}/api/download_tech_sheet_pdf`, {
        params: req.query,
        responseType: "arraybuffer",
      });

      res.setHeader("Content-Type", axiosResp.headers["content-type"] || "application/pdf");
      if (axiosResp.headers["content-disposition"]) {
        res.setHeader("Content-Disposition", axiosResp.headers["content-disposition"]);
      }

      return res.status(axiosResp.status).send(Buffer.from(axiosResp.data));
    } catch (error) {
      console.error("❌ Error proxying tech sheet PDF:", error);
      return res.status(500).json({ error: "Proxy error" });
    }
  });

  app.post("/api/download_tech_sheet_pdf", async (req, res) => {
    try {
      const formData = new FormData();

      Object.keys(req.body).forEach((key) => {
        if (key !== "graphs_image") {
          formData.append(key, String(req.body[key]));
        }
      });

      if (req.body.graphs_image) {
        const imageBuffer = Buffer.from(req.body.graphs_image, "base64");
        formData.append("graphs_image", imageBuffer, {
          filename: "graphs.png",
          contentType: "image/png",
        });
      }

      const axiosResp = await axios.post(`${API_BASE_URL}/api/download_tech_sheet_pdf`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: "arraybuffer",
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      res.setHeader("Content-Type", axiosResp.headers["content-type"] || "application/pdf");
      if (axiosResp.headers["content-disposition"]) {
        res.setHeader("Content-Disposition", axiosResp.headers["content-disposition"]);
      }

      return res.status(axiosResp.status).send(Buffer.from(axiosResp.data));
    } catch (error) {
      console.error("❌ Error proxying tech sheet PDF (POST):", error);
      return res.status(500).json({ error: "Proxy error" });
    }
  });

  // ✅ API proxy route for getting station configuration
  app.get("/api/get_station_result", async (req, res) => {
    try {
      const axiosResp = await axios.get(
        `${API_BASE_URL}/api/get_station_result`,
        {
          params: req.query,
          responseType: "arraybuffer",
        }
      );

      res.setHeader(
        "Content-Type",
        axiosResp.headers["content-type"] || "application/octet-stream"
      );
      if (axiosResp.headers["content-disposition"]) {
        res.setHeader(
          "Content-Disposition",
          axiosResp.headers["content-disposition"]
        );
      }

      return res.status(axiosResp.status).send(Buffer.from(axiosResp.data));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return res
          .status(error.response.status)
          .send(error.response.data);
      }
      console.error("Error proxying station result:", error);
      return res.status(500).json({ error: "Proxy error" });
    }
  });

  // ✅ API proxy route for sending station PDF via email
  app.post("/api/send_station_pdf_email", /* csrfMiddleware, */ async (req, res) => {
    try {
      console.log('📧 Получен запрос на отправку email:', req.body);
      console.log('📧 Заголовки запроса:', req.headers);
      
      const { email, filename } = req.body;
      
      if (!email || !filename) {
        console.error('❌ Отсутствуют обязательные поля:', { email, filename });
        return res.status(400).json({ 
          error: "Missing required fields", 
          details: "Both email and filename are required" 
        });
      }

      const response = await axios.post(`${API_BASE_URL}/api/send_station_pdf_email`, {
        email,
        filename
      });

      return res.status(200).json(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return res.status(error.response.status).json(error.response.data);
      } else {
        console.error("Error sending PDF email:", error);
        return res.status(500).json({
          error: "Failed to send PDF email",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    }
  });

  // ✅ API proxy route for sending station PDF via email to self
  app.post("/api/send_station_pdf_email_to_self", /* csrfMiddleware, */ async (req, res) => {
    try {
      console.log('📧 Получен запрос на отправку email себе:', req.body);
      console.log('📧 Заголовки запроса:', req.headers);
      
      const { email, filename } = req.body;
      
      if (!email || !filename) {
        console.error('❌ Отсутствуют обязательные поля:', { email, filename });
        return res.status(400).json({ 
          error: "Missing required fields", 
          details: "Both email and filename are required" 
        });
      }

      // Извлекаем CSRF токен из заголовков запроса клиента
      const csrfToken = req.headers['x-csrf-token'] as string;
      console.log('🔐 CSRF токен из заголовков:', csrfToken);

      // Передаем CSRF токен в запрос к API
      const headers: Record<string, string> = {};
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      // Также передаем cookies для CSRF
      if (req.headers.cookie) {
        headers['Cookie'] = req.headers.cookie;
      }

      const response = await axios.post(`${API_BASE_URL}/api/send_station_pdf_email_to_self`, {
        email,
        filename
      }, {
        headers,
        withCredentials: true
      });

      return res.status(200).json(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return res.status(error.response.status).json(error.response.data);
      } else {
        console.error("Error sending PDF email to self:", error);
        return res.status(500).json({
          error: "Failed to send PDF email to self",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    }
  });

  // ── Проксирование auth/user/admin и остальных /api/* на backend ───────────
  async function proxyAuth(req: any, res: any, apiPath: string) {
    try {
      const headers: Record<string, string> = {};
      if (req.headers.cookie) headers['Cookie'] = req.headers.cookie;
      // Express нормализует имена заголовков; axios шлёт X-CSRFToken
      const csrfHdr =
        (req.headers["x-csrftoken"] ||
          req.headers["x-csrf-token"]) as string | undefined;
      if (csrfHdr) headers["X-CSRFToken"] = csrfHdr;
      const siteSlugHdr = req.headers["x-site-slug"] as string | undefined;
      if (siteSlugHdr) headers["X-Site-Slug"] = siteSlugHdr;
      // Пробрасываем оригинальный Host для корректных абсолютных URL в ответе API
      if (req.headers.host) headers['X-Forwarded-Host'] = req.headers.host as string;
      headers['X-Forwarded-Proto'] = 'http';
      // Для multipart не ставим Content-Type — axios сам
      const isMultipart = (req.headers['content-type'] || '').includes('multipart');
      if (!isMultipart) headers['Content-Type'] = 'application/json';

      // Backend часто отвечает 405 на HEAD; axios тогда ловит HPE_CLOSED_CONNECTION
      const upstreamMethod =
        req.method === 'HEAD' ? 'GET' : req.method;

      // Строим URL с query string
      const queryStr = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      const targetUrl = `${API_BASE_URL}/api/${apiPath}${queryStr}`;

      const wantsBinary =
        apiPath.includes("download_pdf") ||
        apiPath.includes("download_station_pdf") ||
        apiPath.includes("download_tech_sheet_pdf");

      const response = await axios({
        method: upstreamMethod,
        url: targetUrl,
        data:
          upstreamMethod !== 'GET' &&
          upstreamMethod !== 'HEAD' &&
          upstreamMethod !== 'DELETE'
            ? req.body
            : undefined,
        params:
          upstreamMethod === 'GET' || upstreamMethod === 'DELETE' || upstreamMethod === 'HEAD'
            ? req.query
            : undefined,
        headers,
        withCredentials: true,
        validateStatus: () => true,
        responseType: wantsBinary ? "arraybuffer" : undefined,
      });

      // Пробрасываем Set-Cookie от API браузеру
      const setCookies = response.headers['set-cookie'];
      if (setCookies) res.setHeader('Set-Cookie', setCookies);

      if (req.method === 'HEAD') {
        if (response.status === 204) return res.status(204).end();
        return res.status(response.status).end();
      }

      if (response.status === 204) return res.status(204).send();

      // Для бинарных ответов (JPEG, PDF) — send, не json; пробрасываем заголовки скачивания
      const ct = (response.headers['content-type'] || '').toLowerCase();
      if (ct.startsWith('image/') || ct.startsWith('application/pdf') || ct.startsWith('application/octet-stream')) {
        res.setHeader('Content-Type', ct);
        const cd = response.headers['content-disposition'];
        if (cd) res.setHeader('Content-Disposition', cd);
        const pdfWarn = response.headers['x-pdf-warnings-b64'];
        if (pdfWarn) res.setHeader('X-Pdf-Warnings-B64', pdfWarn);
        if (Buffer.isBuffer(response.data) || typeof response.data === 'string') {
          return res.status(response.status).send(response.data);
        }
        return res.status(response.status).send(Buffer.from(response.data));
      }

      return res.status(response.status).json(response.data);
    } catch (error) {
      console.error(`Proxy error for ${apiPath}:`, error);
      const { status, message } = describeProxyFailure(error);
      return res.status(status).json({ error: message });
    }
  }

  // ── Admin Panel API (проксируем все /api/admin/*) ─────────────────────────
  app.all('/api/admin/*', async (req: any, res: any) => {
    const apiPath = req.path.replace('/api/', '');
    await proxyAuth(req, res, apiPath + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''));
  });

  // ── Авторизация ─────────────────────────────────────────────────────────
  app.post('/api/auth/register/', (req, res) => proxyAuth(req, res, 'auth/register/'));
  app.post('/api/auth/login/', (req, res) => proxyAuth(req, res, 'auth/login/'));
  app.post('/api/auth/logout/', (req, res) => proxyAuth(req, res, 'auth/logout/'));
  app.get('/api/auth/user/', (req, res) => proxyAuth(req, res, 'auth/user/'));

  // ── Личный кабинет ──────────────────────────────────────────────────────
  app.get('/api/user/selections/', (req, res) => proxyAuth(req, res, 'user/selections/'));
  app.post('/api/user/selections/', (req, res) => proxyAuth(req, res, 'user/selections/'));
  app.get('/api/user/projects/', (req, res) => proxyAuth(req, res, 'user/projects/'));
  app.post('/api/user/projects/', (req, res) => proxyAuth(req, res, 'user/projects/'));
  app.post('/api/user/projects/:id/selections/', (req, res) =>
    proxyAuth(req, res, `user/projects/${req.params.id}/selections/`));
  app.delete('/api/user/projects/:id/selections/:selId/', (req, res) =>
    proxyAuth(req, res, `user/projects/${req.params.id}/selections/${req.params.selId}/`));
  app.delete('/api/user/projects/:id/', (req, res) =>
    proxyAuth(req, res, `user/projects/${req.params.id}/`));
  app.patch('/api/user/projects/:id/', (req, res) =>
    proxyAuth(req, res, `user/projects/${req.params.id}/`));
  app.patch('/api/user/selections/:id/rename/', (req, res) =>
    proxyAuth(req, res, `user/selections/${req.params.id}/rename/`));
  app.patch('/api/user/selections/:id/snapshot/', (req, res) =>
    proxyAuth(req, res, `user/selections/${req.params.id}/snapshot/`));
  app.post('/api/user/projects/:id/download_pdf/', (req, res) =>
    proxyAuth(req, res, `user/projects/${req.params.id}/download_pdf/`));

  // ── Fallback: все остальные /api/* → backend ────────────────────────────
  app.all('/api/*', async (req: any, res: any) => {
    const apiPath = req.path.replace('/api/', '');
    const queryStr = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    await proxyAuth(req, res, apiPath + queryStr);
  });

  const httpServer = createServer(app);
  return httpServer;
}
