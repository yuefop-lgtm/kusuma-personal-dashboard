window.apiUrl = (path) =>
  /^https?:\/\//.test(path) ? path : `${window.APP_CONFIG.apiBaseUrl.replace(/\/$/, '')}${path}`;

window.apiFetch = (path, options = {}) =>
  fetch(window.apiUrl(path), {
    ...options,
    credentials: 'include'
  });
