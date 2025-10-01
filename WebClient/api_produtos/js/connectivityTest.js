// Teste de conectividade com o servidor
import { CONFIG } from './config.js';

export const connectivityTest = {
  async testConnection(customUrl = null) {
    const baseUrl = customUrl || CONFIG.API_BASE_URL;
    console.log(`[Connectivity] Testando conexão com: ${baseUrl}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[Connectivity] Timeout - abortando request');
        controller.abort();
      }, 8000); // 8 segundos timeout
      
      console.log(`[Connectivity] Fazendo fetch para: ${baseUrl}/api/produtos`);
      
      const response = await fetch(`${baseUrl}/api/produtos`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`[Connectivity] Resposta recebida:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (response.ok) {
        return {
          success: true,
          status: response.status,
          message: `Conectado com sucesso (HTTP ${response.status})`
        };
      } else {
        return {
          success: false,
          status: response.status,
          message: `Servidor retornou erro HTTP ${response.status}`
        };
      }
      
    } catch (error) {
      console.error(`[Connectivity] Erro capturado:`, {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      let message = 'Erro desconhecido';
      
      if (error.name === 'AbortError') {
        message = 'Timeout: Servidor não respondeu em 8 segundos';
      } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        message = 'Erro de rede: Servidor inacessível ou offline';
      } else if (error.message.includes('CORS')) {
        message = 'Erro de CORS: Servidor não permite acesso';
      } else {
        message = `Erro: ${error.message}`;
      }
      
      return {
        success: false,
        error: error.name,
        message: message
      };
    }
  },

  async testCustomServer(ip, port) {
    const customUrl = `http://${ip}:${port}`;
    console.log(`[Connectivity] Testando servidor customizado: ${customUrl}`);
    return await this.testConnection(customUrl);
  }
};