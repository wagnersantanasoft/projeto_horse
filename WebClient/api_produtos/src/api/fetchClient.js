const DEFAULT_TIMEOUT = 8000;

export async function http(url, { method = "GET", headers = {}, body, timeout = DEFAULT_TIMEOUT } = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const finalHeaders = {
    "Accept": "application/json",
    ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    ...headers
  };

  const resp = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body && !(body instanceof FormData) ? JSON.stringify(body) : body,
    signal: controller.signal
  }).catch(err => {
    clearTimeout(id);
    throw err;
  });

  clearTimeout(id);

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`HTTP ${resp.status} - ${text || resp.statusText}`);
  }

  const contentType = resp.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return resp.json();
  }
  return resp.text();
}