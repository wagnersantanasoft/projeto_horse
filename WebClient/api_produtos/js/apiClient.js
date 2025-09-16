import { CONFIG } from './config.js';

function timeoutPromise(ms, controller) {
  return new Promise((_, reject) => {
    const id = setTimeout(() => {
      controller.abort();
      reject(new Error('Tempo limite excedido'));
    }, ms);
    controller._timeoutId = id;
  });
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const { REQUEST_TIMEOUT_MS, API_BASE_URL } = CONFIG;

  const fetchPromise = fetch(API_BASE_URL + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    signal: controller.signal,
    ...options
  });

  try {
    const res = await Promise.race([
      fetchPromise,
      timeoutPromise(REQUEST_TIMEOUT_MS, controller)
    ]);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return await res.json();
    return null;
  } finally {
    clearTimeout(controller._timeoutId);
  }
}

export const apiClient = {
  get: (p) => request(p, { method: 'GET' }),
  post: (p, d) => request(p, { method: 'POST', body: JSON.stringify(d) }),
  put: (p, d) => request(p, { method: 'PUT', body: JSON.stringify(d) }),
  delete: (p) => request(p, { method: 'DELETE' })
};