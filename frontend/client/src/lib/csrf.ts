import axios from 'axios';
import { getApiBaseUrl } from './config';

// Настройка axios для работы с Django сервером
axios.defaults.baseURL = getApiBaseUrl();
axios.defaults.withCredentials = true;     // cookies туда-обратно
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';

// Глобальное хранилище CSRF токена
let currentCsrfToken: string | null = null;

export async function ensureCsrf() {
  try {
    console.log('🔐 Получаем CSRF токен...');
    const response = await axios.get('/api/csrf/');
    console.log('✅ CSRF токен получен:', response.data);
    
    // Сохраняем токен для использования в POST запросах
    const token = response.data.csrfToken || response.data.csrf;
    console.log('🔍 Извлеченный токен:', token);
    
    if (token) {
      currentCsrfToken = token;
      console.log('💾 CSRF токен сохранен:', token);
      console.log('💾 Проверка сохранения:', getCurrentCsrfToken());
    } else {
      console.error('❌ Токен не найден в ответе:', response.data);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Ошибка получения CSRF токена:', error);
    throw error;
  }
}

export function getCurrentCsrfToken(): string | null {
  return currentCsrfToken;
}

export function clearCsrfToken() {
  currentCsrfToken = null;
}

export default axios;