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

  // Garantir que o card permaneça sempre centralizado - sem movimento
  (function(){
    const card = document.querySelector('.login-container');
    const u = document.getElementById('username');
    
    // Função para forçar centralização
    function forceCenter() {
      if (card) {
        card.style.position = 'fixed';
        card.style.left = '50%';
        card.style.top = '50%';
        card.style.transform = 'translate(-50%, -50%)';
        card.style.zIndex = '9999';
      }
    }
    
    // Aplicar centralização forçada
    forceCenter();
    
    // Foco sem scroll
    if (u) {
      setTimeout(() => {
        if (typeof u.focus === 'function') {
          try { 
            u.focus({ preventScroll: true }); 
            // Forçar centralização após foco
            forceCenter();
          }
          catch(e) { 
            u.focus(); 
            forceCenter();
          }
        }
      }, 120);
    }
    
    // Monitor para garantir que o card não se mova
    const observer = new MutationObserver(() => {
      forceCenter();
    });
    
    if (card) {
      observer.observe(card, { 
        attributes: true, 
        attributeFilter: ['style'] 
      });
    }
    
    // Reforçar centralização em eventos de viewport
    window.addEventListener('resize', forceCenter, { passive: true });
    window.addEventListener('orientationchange', () => {
      setTimeout(forceCenter, 100);
    }, { passive: true });
    
  })();

  // Prevenção de movimento por teclado virtual (versão simplificada)
  (function(){
    const inputs = Array.from(document.querySelectorAll('.login-container input'));
    if (!inputs.length) return;
    
    inputs.forEach(input => {
      input.addEventListener('focus', (e) => {
        // Prevenir scroll e manter card centralizado
        e.preventDefault();
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        
        // Forçar centralização
        const card = document.querySelector('.login-container');
        if (card) {
          card.style.position = 'fixed';
          card.style.left = '50%';
          card.style.top = '50%';
          card.style.transform = 'translate(-50%, -50%)';
        }
      }, { passive: false });
      
      input.addEventListener('blur', () => {
        // Manter overflow hidden para evitar scroll
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
      }, { passive: true });
    });
  })();
});