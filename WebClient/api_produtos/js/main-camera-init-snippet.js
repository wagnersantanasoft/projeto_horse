import { initBarcodeScanner } from './voiceCamera.js';

window.__USER_INTERACTED__ = false;
window.addEventListener('pointerdown', () => { window.__USER_INTERACTED__ = true; }, { once: true });
window.addEventListener('keydown', () => { window.__USER_INTERACTED__ = true; }, { once: true });

const scanner = initBarcodeScanner({
  openButton: document.getElementById('btn-camera'),
  closeButton: document.getElementById('close-camera'),
  overlay: document.getElementById('camera-overlay'),
  video: document.getElementById('camera-video'),
  statusEl: document.getElementById('camera-status'),
  onCode: (code) => {
    const search = document.getElementById('search');
    search.value = code;
    // Chame aqui applyFilters() ou função equivalente:
    // applyFilters();
  }
});
// NÃO chamar scanner.start()