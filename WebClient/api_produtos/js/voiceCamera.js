/* voiceCamera.js – scanner reforçado com QuaggaJS */
export function initVoiceSearch({ button, input, onResult }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (button) {
      button.disabled = true;
      button.title = 'Busca por voz não suportada.';
    }
    return null;
  }
  let recognizing = false;
  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.interimResults = true;

  recognition.onresult = (e) => {
    let t = '';
    for (const res of e.results) t += res[0].transcript;
    input.value = t.trim();
    onResult && onResult(input.value);
  };
  recognition.onstart = () => { recognizing = true; button?.classList.add('active'); };
  recognition.onend   = () => { recognizing = false; button?.classList.remove('active'); };

  button?.addEventListener('click', () => {
    if (recognizing) recognition.stop(); else recognition.start();
  });

  return { stop: () => recognition.stop() };
}

// Função para carregar QuaggaJS dinamicamente
async function loadQuaggaJS() {
  if (window.Quagga) return window.Quagga;
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js';
    script.onload = () => resolve(window.Quagga);
    script.onerror = () => reject(new Error('Falha ao carregar QuaggaJS'));
    document.head.appendChild(script);
  });
}

export function initBarcodeScanner({
  openButtonMobile,
  openButtonDesktop, 
  closeButton,
  overlay,
  video,
  statusEl,
  onCode,
  constrainFormats = [
    'code_128', 'ean_13', 'ean_8', 'code_39', 'code_39_vin',
    'codabar', 'upc_a', 'upc_e', 'i2of5', '2of5', 'code_93'
  ],
  successBeep = true
}) {
  console.log('[Barcode] Inicializando scanner com elementos:', {
    openButtonMobile: !!openButtonMobile,
    openButtonMobileId: openButtonMobile?.id,
    openButtonDesktop: !!openButtonDesktop,
    openButtonDesktopId: openButtonDesktop?.id,
    overlay: !!overlay,
    video: !!video,
    statusEl: !!statusEl,
    isSecure: location.protocol === 'https:' || location.hostname === 'localhost',
    hasCamera: !!navigator.mediaDevices?.getUserMedia
  });
  
  const openButtons = [openButtonMobile, openButtonDesktop].filter(Boolean);
  if (openButtons.length === 0 || !overlay || !video || !statusEl) {
    console.warn('[Barcode] Elementos faltando.');
    return null;
  }
  if (!overlay.hasAttribute('hidden')) overlay.hidden = true;

  const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
  if (!isSecure) {
    openButtons.forEach(btn => {
      btn.disabled = true;
      btn.title = 'Requer HTTPS ou localhost.';
    });
    statusEl.textContent = 'Contexto inseguro.';
    return null;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    openButtons.forEach(btn => {
      btn.disabled = true;
      btn.title = 'Câmera não suportada.';
    });
    statusEl.textContent = 'Sem suporte.';
    return null;
  }

  let active = false;
  let scanning = false;
  let lastDetectedAt = 0;
  let Quagga = null;
  let initRequired = true;

  async function initQuagga() {
    if (!initRequired) return;
    initRequired = false;
    
    try {
      Quagga = await loadQuaggaJS();
      console.log('[Barcode] QuaggaJS carregado com sucesso');
    } catch (error) {
      console.error('[Barcode] Erro ao carregar QuaggaJS:', error);
      statusEl.textContent = 'Erro ao carregar biblioteca de códigos';
      return false;
    }
    return true;
  }

  async function start() {
    if (!window.__USER_INTERACTED__) {
      console.warn('[Barcode] Bloqueado: sem gesto do usuário.');
      window.__USER_INTERACTED__ = true; // Força para desenvolvimento
    }
    if (active) return;
    active = true;
    overlay.hidden = false;
    statusEl.textContent = 'Carregando scanner...';
    
    try {
      const loaded = await initQuagga();
      if (!loaded) {
        active = false;
        setTimeout(stop, 1500);
        return;
      }

      statusEl.textContent = 'Iniciando câmera...';
      
      // Configuração do Quagga
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: video,
          constraints: {
            width: { min: 350, ideal: 640, max: 1280 },
            height: { min: 240, ideal: 480, max: 720 },
            aspectRatio: { min: 1, max: 2 },
            facingMode: "environment" // Câmera traseira
          }
        },
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        numOfWorkers: 2,
        frequency: 10, // Scan frequency
        decoder: {
          readers: constrainFormats.map(format => {
            // Mapeia formatos para os suportados pelo Quagga
            switch(format) {
              case 'ean_13': return 'ean_reader';
              case 'ean_8': return 'ean_8_reader';
              case 'code_128': return 'code_128_reader';
              case 'code_39': return 'code_39_reader';
              case 'code_39_vin': return 'code_39_vin_reader';
              case 'codabar': return 'codabar_reader';
              case 'upc_a': case 'upc_e': return 'ean_reader';
              case 'i2of5': return 'i2of5_reader';
              case '2of5': return 'i2of5_reader';
              case 'code_93': return 'code_93_reader';
              default: return format;
            }
          }).filter((format, index, self) => self.indexOf(format) === index) // Remove duplicatas
        },
        locate: true
      }, function(err) {
        if (err) {
          console.error('[Barcode] Erro na inicialização:', err);
          statusEl.textContent = 'Erro: ' + (err.message || 'Falha na inicialização');
          active = false;
          setTimeout(stop, 2000);
          return;
        }
        
        console.log('[Barcode] Quagga inicializado com sucesso');
        statusEl.textContent = 'Scanner ativo - Posicione o código de barras na área destacada';
        scanning = true;
        
        // Configurar overlay visual
        const cameraBox = overlay.querySelector('.camera-box');
        if (cameraBox) {
          cameraBox.classList.add('scanning');
        }
        
        Quagga.start();
      });

      // Event listener para detecção de código
      Quagga.onDetected(function(result) {
        if (!scanning || !active) return;
        
        const code = result.codeResult.code;
        const now = Date.now();
        
        // Evita detecções muito próximas
        if (now - lastDetectedAt > 1500) {
          lastDetectedAt = now;
          console.log('[Barcode] Código detectado:', code);
          statusEl.textContent = 'Código: ' + code;
          beep();
          onCode && onCode(code);
          setTimeout(() => {
            stop();
          }, 800);
        }
      });

    } catch (err) {
      console.error('[Barcode] Erro no start:', err);
      statusEl.textContent = 'Erro: ' + err.message;
      active = false;
      setTimeout(stop, 1500);
    }
  }

  function stop() {
    console.log('[Barcode] Parando scanner...');
    scanning = false;
    active = false;
    overlay.hidden = true;
    
    // Remover indicadores visuais
    const cameraBox = overlay.querySelector('.camera-box');
    if (cameraBox) {
      cameraBox.classList.remove('scanning');
    }
    
    if (Quagga && typeof Quagga.stop === 'function') {
      try {
        Quagga.stop();
        console.log('[Barcode] Quagga parado');
      } catch (err) {
        console.warn('[Barcode] Erro ao parar Quagga:', err);
      }
    }
  }

  function beep() {
    if (!successBeep) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, 200);
    } catch (err) {
      console.warn('[Barcode] Erro no beep:', err);
    }
  }

  // Eventos para desktop e mobile
  const handleButtonClick = (event) => {
    console.log('[Barcode] Botão ativado - Tipo:', event.type, 'Event:', event);
    console.log('[Barcode] Botão estado:', {
      disabled: openButton.disabled,
      style: openButton.style.cssText,
      classList: Array.from(openButton.classList)
    });
    
    // Prevenir múltiplos eventos
    event.preventDefault();
    event.stopPropagation();
    
    window.__USER_INTERACTED__ = true; // Marca interação do usuário
    
    try {
      start();
    } catch (error) {
      console.error('[Barcode] Erro ao iniciar:', error);
    }
  };
  
  // Adicionar eventos para todos os botões disponíveis
  openButtons.forEach(button => {
    button.addEventListener('click', handleButtonClick);
    button.addEventListener('touchstart', handleButtonClick, { passive: false });
  });
  
  closeButton?.addEventListener('click', () => {
    console.log('[Barcode] Botão fechar clicado');
    stop();
  });

  return { 
    start, 
    stop, 
    isActive: () => active,
    getQuagga: () => Quagga
  };
}