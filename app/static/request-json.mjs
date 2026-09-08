// Bound both the connection and body read; a stalled server must leave loading.
export async function requestJSON(url, { timeout = 15000, fetcher = globalThis.fetch, ...options } = {}) {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Request timed out. Please try again.'));
      controller.abort();
    }, timeout);
  });
  const request = (async () => {
    const response = await fetcher(url, {
      credentials: 'same-origin', cache: 'no-store', ...options, signal: controller.signal,
    });
    if (response.status === 401 || (response.redirected && /\/login(?:\?|$)/.test(response.url))) {
      throw Object.assign(new Error('Please sign in again.'), { status: 401 });
    }
    if (!response.ok) throw new Error(`Request failed (${response.status}).`);
    return response.json();
  })();
  try { return await Promise.race([request, deadline]); }
  finally { clearTimeout(timer); }
}

export function observeMediaQuery(query, listener) {
  if (typeof query.addEventListener === 'function') query.addEventListener('change', listener);
  else query.addListener(listener);
}
