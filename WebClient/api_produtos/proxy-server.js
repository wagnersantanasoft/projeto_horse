// Servidor proxy simples para resolver problemas de CORS
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = 8081;
const TARGET_SERVER = '192.168.1.23:9001';

// Função para fazer proxy das requisições
function makeProxyRequest(targetUrl, res, method = 'GET', postData = null) {
  const options = {
    hostname: '192.168.1.23',
    port: 9001,
    path: targetUrl,
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    // Adicionar headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Content-Type', 'application/json');
    
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Erro no proxy:', err);
    res.writeHead(500, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ error: 'Erro de conexão com o servidor Horse' }));
  });

  if (postData) {
    proxyReq.write(postData);
  }
  
  proxyReq.end();
}

// Função para servir arquivos estáticos
function serveStaticFile(filePath, res) {
  const fullPath = path.join(__dirname, filePath);
  
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Arquivo não encontrado');
      return;
    }
    
    const ext = path.extname(filePath);
    const contentType = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpeg'
    }[ext] || 'text/plain';
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  console.log(`${req.method} ${pathname}`);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Proxy para API do Horse
  if (pathname.startsWith('/api/')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      makeProxyRequest(pathname + (req.url.includes('?') ? '?' + parsedUrl.search : ''), res, req.method, body || null);
    });
    return;
  }
  
  // Servir arquivos estáticos
  if (pathname === '/' || pathname === '/login.html') {
    serveStaticFile('login.html', res);
  } else if (pathname === '/index.html') {
    serveStaticFile('index.html', res);
  } else if (pathname === '/debug-mobile.html') {
    serveStaticFile('debug-mobile.html', res);
  } else if (pathname.startsWith('/css/')) {
    serveStaticFile(pathname, res);
  } else if (pathname.startsWith('/js/')) {
    serveStaticFile(pathname, res);
  } else if (pathname.startsWith('/img/')) {
    serveStaticFile(pathname, res);
  } else {
    res.writeHead(404);
    res.end('Não encontrado');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor proxy rodando em http://localhost:${PORT}`);
  console.log(`Também disponível na rede em http://192.168.1.23:${PORT}`);
  console.log(`Proxy para Horse Server: ${TARGET_SERVER}`);
});

server.on('error', (err) => {
  console.error('Erro no servidor:', err);
});