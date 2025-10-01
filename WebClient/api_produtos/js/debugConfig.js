// Utilitário de debug para testar configuração do servidor
import { serverConfig } from './serverConfig.js';
import { CONFIG } from './config.js';

// Função global para testar configuração no console
window.debugServerConfig = {
  // Mostra configuração atual
  show: () => {
    console.log('=== CONFIGURAÇÃO DO SERVIDOR ===');
    console.log('CONFIG.API_BASE_URL:', CONFIG.API_BASE_URL);
    console.log('serverConfig.getConfig():', serverConfig.getConfig());
    console.log('serverConfig.getApiBaseUrl():', serverConfig.getApiBaseUrl());
  },
  
  // Testa mudança de configuração
  test: (ip = '192.168.1.100', port = 8080) => {
    console.log('=== TESTANDO NOVA CONFIGURAÇÃO ===');
    console.log('Antes:', CONFIG.API_BASE_URL);
    
    const result = serverConfig.saveConfig(ip, port);
    console.log('Resultado:', result);
    
    if (window.updateApiConfig) {
      window.updateApiConfig();
    }
    
    console.log('Depois:', CONFIG.API_BASE_URL);
  },
  
  // Reseta para padrão
  reset: () => {
    console.log('=== RESETANDO CONFIGURAÇÃO ===');
    console.log('Antes:', CONFIG.API_BASE_URL);
    
    const result = serverConfig.resetToDefault();
    console.log('Resultado:', result);
    
    if (window.updateApiConfig) {
      window.updateApiConfig();
    }
    
    console.log('Depois:', CONFIG.API_BASE_URL);
  }
};

console.log('Debug da configuração carregado! Use:');
console.log('- window.debugServerConfig.show() - mostra configuração atual');
console.log('- window.debugServerConfig.test("192.168.1.100", 8080) - testa nova configuração');
console.log('- window.debugServerConfig.reset() - reseta para padrão');