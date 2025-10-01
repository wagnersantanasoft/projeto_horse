// Função para obter configuração do servidor (IP e porta)
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
      console.warn('Erro ao carregar configuração salva:', error);
    }
    
    // Configuração padrão para Cordova (proxy server na rede)
    return 'http://192.168.1.23:8081';
  }
  
  // Se estamos rodando via proxy (qualquer IP na porta 8081), usar URLs relativas
  if (window.location.port === '8081') {
    console.log('🔧 [CONFIG] Detectado proxy server na porta 8081 - usando URLs relativas');
    return ''; // URL base vazia para usar caminhos relativos
  }
  
  try {
    const saved = localStorage.getItem('cv_server_config');
    if (saved) {
      const config = JSON.parse(saved);
      console.log('🔧 [CONFIG] Usando configuração salva:', config);
      return `http://${config.ip}:${config.port}`;
    }
  } catch (error) {
    console.warn('Erro ao carregar configuração do servidor, usando padrão:', error);
  }
  
  // Configuração padrão
  console.log('🔧 [CONFIG] Usando configuração padrão');
  return 'http://192.168.1.23:9001';
}

export const CONFIG = {
  API_BASE_URL: getServerConfig(),
  ENDPOINT_PRODUCTS: '/api/produtos',
  ENDPOINT_USERS: '/api/usuarios',
  PAGE_SIZE: 25,
  REQUEST_TIMEOUT_MS: (!!window.cordova || !!window.device) ? 20000 : 12000, // Timeout maior para mobile
  STORAGE_PREFIX: 'cv_' // prefixo para persistência
};

// Função para atualizar a URL da API quando a configuração mudar
window.updateApiConfig = function() {
  const newUrl = getServerConfig();
  CONFIG.API_BASE_URL = newUrl;
  console.log('🔄 [CONFIG] API_BASE_URL atualizada para:', CONFIG.API_BASE_URL);
  console.log('🌐 [CONFIG] Window location:', window.location.href);
  console.log('🔌 [CONFIG] Detectado porta 8081?', window.location.port === '8081');
};