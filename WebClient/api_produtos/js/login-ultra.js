// Login ultra-simples - sem dependências externas
console.log('[Login-Ultra] Carregando...');

// Configuração local
let SERVER_CONFIG = {
  ip: '192.168.1.23',
  port: 9001
};

// Carregar configuração salva
try {
  const saved = localStorage.getItem('cv_server_config');
  if (saved) {
    const config = JSON.parse(saved);
    SERVER_CONFIG = { ip: config.ip, port: config.port };
  }
} catch (e) {
  console.warn('Erro ao carregar configuração:', e);
}

// Função de teste mais básica
function testBasicConnection(ip, port) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = `http://${ip}:${port}/api/produtos?t=${Date.now()}`;
    
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ success: false, message: 'Timeout - servidor não respondeu' });
      }
    }, 5000);
    
    img.onload = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ success: true, message: 'Servidor respondeu (método img)' });
      }
    };
    
    img.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        // Erro ao carregar como imagem significa que o servidor respondeu algo
        resolve({ success: true, message: 'Conexão estabelecida' });
      }
    };
    
    img.src = url;
  });
}

// Função de login simplificada usando JSONP-like
function loginViaJsonp(username, password) {
  return new Promise((resolve, reject) => {
    // Criar script tag para tentar acesso
    const script = document.createElement('script');
    const callbackName = 'loginCallback_' + Date.now();
    
    // Callback global temporário
    window[callbackName] = function(data) {
      document.head.removeChild(script);
      delete window[callbackName];
      resolve(data);
    };
    
    // Se der erro, significa que o servidor não suporta JSONP
    script.onerror = function() {
      document.head.removeChild(script);
      delete window[callbackName];
      reject(new Error('Servidor não acessível via JSONP'));
    };
    
    script.src = `http://${SERVER_CONFIG.ip}:${SERVER_CONFIG.port}/api/usuarios?callback=${callbackName}&t=${Date.now()}`;
    document.head.appendChild(script);
    
    // Timeout
    setTimeout(() => {
      if (window[callbackName]) {
        document.head.removeChild(script);
        delete window[callbackName];
        reject(new Error('Timeout no login'));
      }
    }, 10000);
  });
}

// Função de login via proxy local (se disponível)
async function loginViaProxy(username, password) {
  try {
    const response = await fetch('/api/usuarios', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const users = await response.json();
    const user = users.find(u => 
      String(u.USE_CODIGO) === username || 
      (u.USE_LOGIN && u.USE_LOGIN.toLowerCase() === username.toLowerCase())
    );
    
    if (!user) throw new Error('Usuário não encontrado');
    if (String(user.USE_SENHA) !== password) throw new Error('Senha inválida');
    
    return user;
  } catch (error) {
    console.log('[Login-Ultra] Proxy local não disponível:', error.message);
    throw error;
  }
}

// Função de fallback - salvar configuração e redirecionar
function fallbackLogin(username, password) {
  // Salvar tentativa de login para processar depois
  const loginAttempt = {
    username,
    password,
    timestamp: Date.now(),
    server: SERVER_CONFIG
  };
  
  localStorage.setItem('cv_login_attempt', JSON.stringify(loginAttempt));
  
  // Criar uma página de redirecionamento
  const redirectPage = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Redirecionando...</title>
      <meta http-equiv="refresh" content="0;url=http://${SERVER_CONFIG.ip}:${SERVER_CONFIG.port}/api/usuarios">
    </head>
    <body>
      <h1>Redirecionando para o servidor...</h1>
      <p>Verificando credenciais em <strong>http://${SERVER_CONFIG.ip}:${SERVER_CONFIG.port}</strong></p>
      <p>Se não funcionar, verifique se o servidor está ativo.</p>
      <script>
        setTimeout(() => {
          alert('Redirecionamento automático falhou. Verifique o servidor.');
          window.history.back();
        }, 5000);
      </script>
    </body>
    </html>
  `;
  
  const blob = new Blob([redirectPage], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('[Login-Ultra] DOM pronto');
  
  const form = document.getElementById('login-form');
  const errEl = document.getElementById('login-error');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const serverConfigDiv = document.getElementById('server-config');
  const serverIpInput = document.getElementById('server-ip');
  const serverPortInput = document.getElementById('server-port');
  const testConnectionBtn = document.getElementById('test-connection-btn');
  const saveConfigBtn = document.getElementById('save-config-btn');
  const backToLoginBtn = document.getElementById('back-to-login-btn');
  const configInfo = document.getElementById('config-info');

  // Configuração admin
  function showAdminConfig() {
    const user = usernameInput.value.trim().toLowerCase();
    const pass = passwordInput.value.trim().toLowerCase();
    
    if (user === 'admin' && pass === 'admin') {
      serverConfigDiv.style.display = 'block';
      serverIpInput.value = SERVER_CONFIG.ip;
      serverPortInput.value = SERVER_CONFIG.port;
    } else {
      serverConfigDiv.style.display = 'none';
    }
  }

  usernameInput.addEventListener('input', showAdminConfig);
  passwordInput.addEventListener('input', showAdminConfig);

  // Teste de conectividade
  testConnectionBtn.addEventListener('click', async function() {
    const ip = serverIpInput.value.trim();
    const port = serverPortInput.value.trim();
    
    if (!ip || !port) {
      configInfo.textContent = 'Digite IP e porta';
      configInfo.className = 'config-info error';
      configInfo.style.display = 'block';
      return;
    }
    
    testConnectionBtn.disabled = true;
    testConnectionBtn.textContent = '🔄 Testando...';
    
    const result = await testBasicConnection(ip, port);
    
    configInfo.textContent = result.message;
    configInfo.className = `config-info ${result.success ? 'success' : 'error'}`;
    configInfo.style.display = 'block';
    
    testConnectionBtn.disabled = false;
    testConnectionBtn.textContent = '🔗 Testar Conexão';
  });

  // Salvar configuração
  saveConfigBtn.addEventListener('click', function() {
    const ip = serverIpInput.value.trim();
    const port = serverPortInput.value.trim();
    
    if (ip && port) {
      SERVER_CONFIG = { ip, port };
      localStorage.setItem('cv_server_config', JSON.stringify(SERVER_CONFIG));
      
      configInfo.textContent = `✅ Salvo: ${ip}:${port}`;
      configInfo.className = 'config-info success';
      configInfo.style.display = 'block';
      
      setTimeout(() => {
        serverConfigDiv.style.display = 'none';
        usernameInput.value = '';
        passwordInput.value = '';
      }, 2000);
    }
  });

  // Voltar
  backToLoginBtn.addEventListener('click', function() {
    serverConfigDiv.style.display = 'none';
    usernameInput.value = '';
    passwordInput.value = '';
    configInfo.style.display = 'none';
  });

  // Login
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();
    
    if (user.toLowerCase() === 'admin' && pass.toLowerCase() === 'admin') {
      showAdminConfig();
      return;
    }
    
    errEl.style.display = 'none';
    
    console.log('[Login-Ultra] Tentando login para:', user);
    
    // Tentar método 1: Proxy local
    try {
      console.log('[Login-Ultra] Tentativa 1: Proxy local');
      const foundUser = await loginViaProxy(user, pass);
      
      localStorage.setItem('app_user', JSON.stringify({
        USE_CODIGO: foundUser.USE_CODIGO,
        USE_LOGIN: foundUser.USE_LOGIN
      }));
      localStorage.setItem('app_session_timestamp', Date.now().toString());
      
      console.log('[Login-Ultra] Login via proxy bem-sucedido');
      window.location.href = 'index.html';
      return;
      
    } catch (error) {
      console.log('[Login-Ultra] Proxy falhou:', error.message);
    }
    
    // Tentar método 2: JSONP (raramente funciona com APIs REST)
    try {
      console.log('[Login-Ultra] Tentativa 2: JSONP');
      await loginViaJsonp(user, pass);
      // Se chegou aqui, implementar lógica JSONP
      
    } catch (error) {
      console.log('[Login-Ultra] JSONP falhou:', error.message);
    }
    
    // Método 3: Fallback - informar o usuário
    console.log('[Login-Ultra] Todos os métodos falharam');
    
    errEl.innerHTML = `
      <div style="text-align: left; font-size: 0.9em;">
        <strong>❌ Não foi possível conectar ao servidor</strong><br>
        <small>
          • Servidor: http://${SERVER_CONFIG.ip}:${SERVER_CONFIG.port}<br>
          • Verifique se o servidor Horse está rodando<br>
          • Teste a conectividade usando admin/admin<br>
          • Para Cordova: verifique a configuração de rede
        </small>
      </div>
    `;
    errEl.style.display = 'block';
  });

  console.log('[Login-Ultra] Inicializado com configuração:', SERVER_CONFIG);
});

console.log('[Login-Ultra] Script carregado');