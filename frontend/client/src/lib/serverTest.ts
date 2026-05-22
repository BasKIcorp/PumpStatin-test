// Утилита для тестирования подключения к серверу
import axios from 'axios';

export async function testServerConnection(serverUrl: string): Promise<boolean> {
  try {
    console.log(`🔍 Тестируем подключение к серверу: ${serverUrl}`);
    
    const response = await axios.get(`${serverUrl}/api/csrf/`, {
      timeout: 5000,
      validateStatus: (status) => status < 500 // Принимаем любые статусы меньше 500
    });
    
    console.log(`✅ Сервер ${serverUrl} доступен. Статус: ${response.status}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Сервер ${serverUrl} недоступен:`, {
      message: error.message,
      code: error.code,
      status: error.response?.status
    });
    return false;
  }
}

export async function testAllServers(): Promise<void> {
  const servers = [
    'http://127.0.0.1:5000',  // Node.js сервер локально
    '/api/csrf/'  // Относительный путь на VPS (через Nginx)
  ];
  
  console.log('🚀 Тестируем все серверы...');
  
  for (const server of servers) {
    const isAvailable = await testServerConnection(server);
    if (isAvailable) {
      console.log(`✅ Рекомендуется использовать: ${server}`);
      break;
    }
  }
}

// Добавляем в window для доступа из консоли браузера
if (typeof window !== 'undefined') {
  (window as any).testServers = testAllServers;
  (window as any).testServer = testServerConnection;
}
