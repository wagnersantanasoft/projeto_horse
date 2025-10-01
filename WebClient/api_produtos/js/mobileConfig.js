// Configuração específica para Cordova/dispositivos móveis
import { CONFIG } from './config.js';

// Detectar se está rodando no Cordova
const isCordova = !!window.cordova;
const isDevice = !!window.device;

// Configuração de rede para dispositivos móveis
const MOBILE_CONFIG = {
  // IP do computador que roda o proxy server na rede local
  PROXY_SERVER_IP: '192.168.1.23',
  PROXY_SERVER_PORT: '8081',
  
  // IP do servidor Horse direto (fallback)
  HORSE_SERVER_IP: '192.168.1.23',
  HORSE_SERVER_PORT: '9001'
};

// Função para obter configuração baseada no ambiente
export function getMobileServerConfig() {
  if (isCordova || isDevice) {
    // Em dispositivo móvel, tentar proxy server primeiro
    return `http://${MOBILE_CONFIG.PROXY_SERVER_IP}:${MOBILE_CONFIG.PROXY_SERVER_PORT}`;
  }
  
  // Em navegador desktop, usar configuração padrão
  return CONFIG.API_BASE_URL;
}

// Função para detectar se é ambiente Cordova
export function isCordovaApp() {
  return isCordova || isDevice;
}

// Configuração de timeout mais longo para dispositivos móveis
export function getMobileTimeout() {
  return isCordovaApp() ? 20000 : CONFIG.REQUEST_TIMEOUT_MS;
}

// Log para debug em dispositivos
if (isCordovaApp()) {
  console.log('🔧 Cordova detectado - Configuração móvel ativa');
  console.log('📱 Servidor proxy:', getMobileServerConfig());
  console.log('⏱️ Timeout:', getMobileTimeout() + 'ms');
  
  // Salvar log no dispositivo se possível
  document.addEventListener('deviceready', () => {
    console.log('📱 Device ready - Cordova inicializado');
    console.log('📊 Device info:', {
      platform: window.device?.platform,
      version: window.device?.version,
      model: window.device?.model
    });
  });
}