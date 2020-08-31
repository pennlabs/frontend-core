export const SITE_ORIGIN =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? `http://${window.location.host}`
    : `https://${window.location.host}`;

export function getApiUrl(path: string): string {
  // If path is a fully qualified cross-origin path, don't try and change it
  if (/^https?:\/\//.test(path)) {
    const url = new URL(path);
    return url.pathname + url.search;
  }
  // If it's local and relative, make it absolute for Next to be happy
  return SITE_ORIGIN + path;
}

/**
 * @returns {string | boolean} The CSRF token used by the Django REST Framework
 */
const getCsrf = () =>
  document.cookie &&
  document.cookie
    .split("; ")
    .reduce(
      (acc, cookie) =>
        acc ||
        (cookie.substring(0, "csrftoken".length + 1) === "csrftoken=" &&
          decodeURIComponent(cookie.substring("csrftoken=".length))),
      null
    );

export function doApiRequest(path: string, data?: any): Promise<Response> {
  let formattedData = data;
  if (!formattedData) {
    formattedData = {};
  }
  formattedData.credentials = "include";
  formattedData.mode = "same-origin";
  if (typeof document !== "undefined") {
    formattedData.headers = formattedData.headers || {};
    if (!(formattedData.body instanceof FormData)) {
      formattedData.headers.Accept = "application/json";
      formattedData.headers["Content-Type"] = "application/json";
    }
    formattedData.headers["X-CSRFToken"] = getCsrf();
  }
  if (formattedData.body && !(formattedData.body instanceof FormData)) {
    formattedData.body = JSON.stringify(formattedData.body);
  }
  return fetch(getApiUrl(path), formattedData);
}
