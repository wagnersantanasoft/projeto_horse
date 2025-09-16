/* voiceCamera.js – scanner reforçado */
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

export function initBarcodeScanner({
  openButton,
  closeButton,
  overlay,
  video,
  statusEl,
  onCode,
  constrainFormats = [
    'ean_13','ean_8','code_128','code_39','upc_e','upc_a',
    'itf','codabar','qr_code','data_matrix','aztec','pdf417'
  ],
  successBeep = true
}) {
  if (!openButton || !overlay || !video || !statusEl) {
    console.warn('[Barcode] Elementos faltando.');
    return null;
  }
  if (!overlay.hasAttribute('hidden')) overlay.hidden = true;

  const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
  if (!isSecure) {
    openButton.disabled = true;
    openButton.title = 'Requer HTTPS ou localhost.';
    statusEl.textContent = 'Contexto inseguro.';
    return null;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    openButton.disabled = true;
    openButton.title = 'Câmera não suportada.';
    statusEl.textContent = 'Sem suporte.';
    return null;
  }

  let stream = null;
  let active = false;
  let barcodeDetector = null;
  let scanning = false;
  let lastDetectedAt = 0;

  async function initDetector() {
    if ('BarcodeDetector' in window) {
      try {
        barcodeDetector = new window.BarcodeDetector({ formats: constrainFormats });
      } catch {
        barcodeDetector = null;
      }
    }
  }

  async function start() {
    if (!window.__USER_INTERACTED__) {
      console.warn('[Barcode] Bloqueado: sem gesto do usuário.');
      return;
    }
    if (active) return;
    active = true;
    overlay.hidden = false;
    statusEl.textContent = 'Solicitando câmera...';
    try {
      await initDetector();
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      video.srcObject = stream;
      await video.play();
      statusEl.textContent = barcodeDetector
        ? 'Aponte o código ao centro.'
        : 'Sem API nativa (adicione biblioteca externa).';
      scanning = true;
      requestAnimationFrame(scanLoop);
    } catch (err) {
      statusEl.textContent = 'Erro: ' + err.message;
      active = false;
      setTimeout(stop, 1500);
    }
  }

  function stop() {
    scanning = false;
    active = false;
    overlay.hidden = true;
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
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
    } catch {}
  }

  async function scanLoop() {
    if (!scanning || !active) return;
    if (barcodeDetector) {
      try {
        const codes = await barcodeDetector.detect(video);
        if (codes.length > 0) {
          const value = codes[0].rawValue;
          const now = Date.now();
          if (now - lastDetectedAt > 900) {
            lastDetectedAt = now;
            statusEl.textContent = 'Código: ' + value;
            beep();
            onCode && onCode(value);
            setTimeout(stop, 600);
            return;
          }
        }
      } catch {
        // silencioso
      }
    }
    requestAnimationFrame(scanLoop);
  }

  openButton.addEventListener('click', () => start());
  closeButton?.addEventListener('click', () => stop());

  return { start, stop, isActive: () => active };
}