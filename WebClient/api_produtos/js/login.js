// Login page JavaScript functionality
import { usersService } from './usersService.js';

// Aplica o tema salvo pela aplicação principal (usa mesmo storage prefix 'cv_')
(function(){
  try {
    const key = 'cv_theme';
    const t = localStorage.getItem(key);
    if (t) document.documentElement.setAttribute('data-theme', t);
  } catch(e){}
})();

// Login form handling
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('login-form');
  const errEl = document.getElementById('login-error');

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    errEl.style.display = 'none';
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    
    try {
      const list = await usersService.listAll();
      // tenta encontrar por código ou login
      const found = list.find(u => String(u.USE_CODIGO) === user || (u.USE_LOGIN && u.USE_LOGIN.toLowerCase() === user.toLowerCase()));
      
      if (!found) {
        errEl.textContent = 'Usuário não encontrado.';
        errEl.style.display = 'block';
        return;
      }
      
      // ATENÇÃO: comparação simples de senha (dependendo da API, pode ser hash)
      if (String(found.USE_SENHA) === pass) {
        // sucesso: salvar sessão mínima com timestamp
        localStorage.setItem('app_user', JSON.stringify({ USE_CODIGO: found.USE_CODIGO, USE_LOGIN: found.USE_LOGIN }));
        localStorage.setItem('app_session_timestamp', Date.now().toString());
        console.log('Login bem-sucedido, sessão iniciada');
        window.location.href = 'index.html';
      } else {
        errEl.textContent = 'Senha inválida.';
        errEl.style.display = 'block';
      }
    } catch (err) {
      console.error('Erro ao validar login:', err);
      errEl.textContent = 'Erro ao conectar com o servidor.';
      errEl.style.display = 'block';
    }
  });

  // Garantir foco no input username sem deslocar o card (preventScroll quando disponível)
  (function(){
    const u = document.getElementById('username');
    try {
      if (u) {
        // timeout curto para esperar a pintura inicial
        setTimeout(() => {
          if (typeof u.focus === 'function') {
            try { u.focus({ preventScroll: true }); }
            catch(e) { u.focus(); }
          }
        }, 120);
      }
    } catch(e){}
  })();

  // Fallback para alguns WebViews/ navegadores móveis que reposicionam fixed ao abrir teclado
  (function(){
    const inputs = Array.from(document.querySelectorAll('.login-container input'));
    if (!inputs.length) return;
    let originalHtmlHeight = '';
    
    function onFocus() {
      try {
        // fixa a altura do root para o valor atual da janela (evita resize da viewport)
        originalHtmlHeight = document.documentElement.style.height || '';
        document.documentElement.style.height = window.innerHeight + 'px';
      } catch(e){}
    }
    
    function onBlur(){
      try {
        document.documentElement.style.height = originalHtmlHeight;
      } catch(e){}
    }
    
    inputs.forEach(i => {
      i.addEventListener('focus', onFocus, { passive: true });
      i.addEventListener('blur', onBlur, { passive: true });
    });
  })();
});