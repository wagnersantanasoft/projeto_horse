// Função para obter configuração do servidor (IP e porta)
function getServerConfig() {
  try {
    const saved = localStorage.getItem('cv_server_config');
    if (saved) {
      const config = JSON.parse(saved);
      return `http://${config.ip}:${config.port}`;
    }
  } catch (error) {
    console.warn('Erro ao carregar configuração do servidor, usando padrão:', error);
  }
  // Configuração padrão
  return 'http://192.168.1.23:9001';
}

export const CONFIG = {
  API_BASE_URL: getServerConfig(),
  ENDPOINT_PRODUCTS: '/api/produtos',
  ENDPOINT_USERS: '/api/usuarios',
  PAGE_SIZE: 25,
  REQUEST_TIMEOUT_MS: 12000,
  STORAGE_PREFIX: 'cv_' // prefixo para persistência
};

// Função para atualizar a URL da API quando a configuração mudar
window.updateApiConfig = function() {
  CONFIG.API_BASE_URL = getServerConfig();
  console.log('API_BASE_URL atualizada para:', CONFIG.API_BASE_URL);
};