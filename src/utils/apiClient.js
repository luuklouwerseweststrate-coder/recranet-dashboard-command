const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function apiFetch(path, options = {}) {
  return fetch(apiUrl(path), {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.headers ?? {}),
    },
  });
}
