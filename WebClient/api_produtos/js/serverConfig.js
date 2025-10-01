// Utilitário para gerenciar configuração do servidor
export class ServerConfigManager {
  constructor() {
    this.storageKey = 'cv_server_config';
    this.defaultConfig = {
      ip: '192.168.1.23',
      port: 9001
    };
  }

  // Carrega a configuração salva ou retorna a padrão
  getConfig() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const config = JSON.parse(saved);
        return {
          ip: config.ip || this.defaultConfig.ip,
          port: config.port || this.defaultConfig.port
        };
      }
    } catch (error) {
      console.warn('Erro ao carregar configuração do servidor:', error);
    }
    return { ...this.defaultConfig };
  }

  // Salva a nova configuração
  saveConfig(ip, port) {
    try {
      // Validações básicas
      if (!ip || !ip.trim()) {
        throw new Error('IP é obrigatório');
      }
      
      if (!port || port < 1 || port > 65535) {
        throw new Error('Porta deve estar entre 1 e 65535');
      }

      const config = {
        ip: ip.trim(),
        port: parseInt(port, 10),
        lastUpdated: new Date().toISOString()
      };

      localStorage.setItem(this.storageKey, JSON.stringify(config));
      
      // Atualiza a configuração global se disponível
      this.updateGlobalConfig(config);
      
      return { success: true, message: 'Configuração salva com sucesso!' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Atualiza a configuração global importada dinamicamente
  updateGlobalConfig(config) {
    try {
      // Se o CONFIG global estiver disponível, atualiza diretamente
      if (window.CONFIG) {
        window.CONFIG.API_BASE_URL = `http://${config.ip}:${config.port}`;
        console.log('Configuração global atualizada:', window.CONFIG.API_BASE_URL);
      }
    } catch (error) {
      console.warn('Não foi possível atualizar CONFIG global:', error);
    }
  }

  // Gera a URL da API baseada na configuração atual
  getApiBaseUrl() {
    const config = this.getConfig();
    return `http://${config.ip}:${config.port}`;
  }

  // Valida se o formato do IP é válido (básico)
  isValidIP(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip) || ip === 'localhost';
  }

  // Valida a configuração
  validateConfig(ip, port) {
    const errors = [];
    
    if (!ip || !ip.trim()) {
      errors.push('IP é obrigatório');
    } else if (!this.isValidIP(ip.trim())) {
      errors.push('Formato de IP inválido');
    }
    
    const portNum = parseInt(port, 10);
    if (!port || isNaN(portNum) || portNum < 1 || portNum > 65535) {
      errors.push('Porta deve ser um número entre 1 e 65535');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Reseta para configuração padrão
  resetToDefault() {
    try {
      localStorage.removeItem(this.storageKey);
      this.updateGlobalConfig(this.defaultConfig);
      return { success: true, message: 'Configuração resetada para padrão' };
    } catch (error) {
      return { success: false, message: 'Erro ao resetar configuração' };
    }
  }
}

// Instância global para fácil acesso
export const serverConfig = new ServerConfigManager();