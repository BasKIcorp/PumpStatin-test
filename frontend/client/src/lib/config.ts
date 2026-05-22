// Конфигурация для работы с разными серверами
const API_CONFIG = {
  /** Локально всегда относительные пути: тот же origin, что и страница (localhost vs 127.0.0.1 — разные сайты для cookie). */
  LOCAL: "",
  VPS: "" // На VPS — относительные пути через Nginx
};

// Определяем, какой сервер использовать
function getApiBaseUrl(): string {
  // Проверяем, есть ли принудительная настройка в localStorage
  const forceVps = localStorage.getItem('forceVpsServer');
  if (forceVps === 'true') {
    console.log('🔧 Принудительно используем VPS сервер (относительные пути)');
    return API_CONFIG.VPS; // Пустая строка = относительные пути
  }
  
  // Проверяем, находимся ли мы на VPS или localhost
  const hostname = window.location.hostname;
  
  console.log('🌐 Текущий hostname:', hostname);
  console.log('🌐 Текущий URL:', window.location.href);
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('🏠 Локальная разработка: API с того же origin (относительные URL)');
    return API_CONFIG.LOCAL;
  } else {
    console.log('☁️ Используем VPS сервер (относительные пути через Nginx)');
    return API_CONFIG.VPS; // Пустая строка = относительные пути
  }
}

export { API_CONFIG, getApiBaseUrl };
