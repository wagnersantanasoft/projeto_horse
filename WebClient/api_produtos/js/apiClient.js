import { CONFIG } from './config.js';

// Importar a função getServerConfig para sempre obter URL atualizada
function getServerConfig() {
  // Detectar se está no Cordova/dispositivo móvel
  const isCordova = !!window.cordova || !!window.device;
  
  if (isCordova) {
    // Em dispositivo móvel, usar IP do proxy server na rede local
    try {
      const saved = localStorage.getItem('cv_server_config');
      if (saved) {
        const config = JSON.parse(saved);
        return `http://${config.ip}:${config.port}`;
      }
    } catch (error) {
      console.warn('[API] Erro ao carregar configuração salva:', error);
    }
    
    // Configuração padrão para Cordova (proxy server na rede)
    return 'http://192.168.1.23:8081';
  }
  
  // Se estamos rodando via proxy (qualquer IP na porta 8081), usar URLs relativas
  if (window.location.port === '8081') {
    console.log('🔧 [API] Detectado proxy server na porta 8081 - usando URLs relativas');
    return ''; // URL base vazia para usar caminhos relativos
  }
  
  try {
    const saved = localStorage.getItem('cv_server_config');
    if (saved) {
      const config = JSON.parse(saved);
      console.log('🔧 [API] Usando configuração salva:', config);
      return `http://${config.ip}:${config.port}`;
    }
  } catch (error) {
    console.warn('[API] Erro ao carregar configuração do servidor, usando padrão:', error);
  }
  
  // Configuração padrão
  console.log('🔧 [API] Usando configuração padrão');
  return 'http://192.168.1.23:9001';
}

function timeoutPromise(ms, controller) {
  return new Promise((_, reject) => {
    const id = setTimeout(() => {
      controller.abort();
      reject(new Error('Tempo limite excedido'));
    }, ms);
    controller._timeoutId = id;
  });
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const { REQUEST_TIMEOUT_MS } = CONFIG;
  
  // Obter URL dinâmica sempre atualizada
  const API_BASE_URL = getServerConfig();
  const fullUrl = API_BASE_URL + path;

  console.log('🌐 [MOBILE DEBUG] ApiClient.request iniciado');
  console.log('🔗 [MOBILE DEBUG] URL completa:', fullUrl);
  console.log('⏱️ [MOBILE DEBUG] Timeout:', REQUEST_TIMEOUT_MS + 'ms');
  console.log('🌍 [MOBILE DEBUG] Location:', window.location.href);

  const fetchPromise = fetch(fullUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    signal: controller.signal,
    ...options
  });

  try {
    console.log('📡 [MOBILE DEBUG] Enviando requisição...');
    const res = await Promise.race([
      fetchPromise,
      timeoutPromise(REQUEST_TIMEOUT_MS, controller)
    ]);
    
    console.log('📨 [MOBILE DEBUG] Resposta recebida:', {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      headers: Object.fromEntries(res.headers.entries())
    });
    
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const errorMsg = `HTTP ${res.status} ${res.statusText} ${text}`;
      console.error(`❌ [MOBILE DEBUG] Erro HTTP:`, errorMsg);
      throw new Error(errorMsg);
    }
    
    const ct = res.headers.get('content-type') || '';
    console.log('📋 [MOBILE DEBUG] Content-Type:', ct);
    
    if (ct.includes('application/json')) {
      const jsonData = await res.json();
      console.log('✅ [MOBILE DEBUG] JSON parseado com sucesso');
      console.log('📊 [MOBILE DEBUG] Dados:', typeof jsonData, Array.isArray(jsonData) ? `array[${jsonData.length}]` : jsonData);
      return jsonData;
    }
    return null;
  } catch (error) {
    console.error(`❌ [MOBILE DEBUG] Erro detalhado:`, {
      message: error.message,
      name: error.name,
      url: fullUrl,
      method: options.method || 'GET'
    });
    
    // Melhorar mensagens de erro para o usuário
    if (error.name === 'AbortError' || error.message.includes('Tempo limite')) {
      throw new Error('Timeout: Servidor não respondeu. Verifique a conexão e as configurações.');
    } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
      throw new Error('Erro de rede: Verifique se o servidor está ativo e acessível.');
    } else if (error.message.includes('CORS')) {
      throw new Error('Erro de CORS: Servidor não permite acesso desta origem.');
    }
    
    throw error;
  } finally {
    clearTimeout(controller._timeoutId);
  }
}

export const apiClient = {
  get: (p) => request(p, { method: 'GET' }),
  post: (p, d) => request(p, { method: 'POST', body: JSON.stringify(d) }),
  put: (p, d) => request(p, { method: 'PUT', body: JSON.stringify(d) }),
  delete: (p) => request(p, { method: 'DELETE' })
};