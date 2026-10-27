import axios from "axios";

/**
 * Single API client. Requests go to /api/v1 on this origin and are proxied to Django
 * (see next.config.mjs). Django's CSRF cookie is sent back as the X-CSRFToken header.
 */
export const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
  headers: { Accept: "application/json" },
  timeout: 30000,
});

let csrfPromise = null;

/** Make sure the csrftoken cookie exists before the first unsafe request. */
export function ensureCsrf() {
  if (typeof document !== "undefined" && document.cookie.includes("csrftoken=")) {
    return Promise.resolve();
  }
  csrfPromise ??= api.get("/auth/csrf/").finally(() => {
    csrfPromise = null;
  });
  return csrfPromise;
}

api.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();
  if (!["get", "head", "options"].includes(method) && !config.url?.startsWith("/auth/csrf")) {
    await ensureCsrf();
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    if (
      typeof window !== "undefined" &&
      (status === 401 || (status === 403 && code === "not_authenticated")) &&
      !window.location.pathname.startsWith("/login")
    ) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      // Full navigation: the session is gone, so discard all client state.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/login?next=${next}&expired=1`);
    }
    return Promise.reject(error);
  },
);

/** Human-readable message for any API error. Never exposes stack traces or internals. */
export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;
  if (error.code === "ECONNABORTED") return "The server took too long to respond.";
  if (!error.response) return "Cannot reach the server. Check your connection.";
  const { status, data } = error.response;
  if (status >= 500) return "The server encountered an error. Please try again later.";
  if (data?.detail) return data.detail;
  return fallback;
}

/** Field errors keyed by field name, e.g. {email: "Already in use."}. */
export function fieldErrors(error) {
  const errors = error?.response?.data?.errors;
  if (!errors || Array.isArray(errors) || typeof errors !== "object") return {};
  return Object.fromEntries(
    Object.entries(errors).map(([key, value]) => [key, Array.isArray(value) ? String(value[0]) : String(value)]),
  );
}

/** Push server-side field errors into a react-hook-form instance. Returns true if any matched. */
export function applyFieldErrors(error, setError, knownFields) {
  const errors = fieldErrors(error);
  let matched = false;
  for (const [field, message] of Object.entries(errors)) {
    if (!knownFields || knownFields.includes(field)) {
      setError(field, { type: "server", message });
      matched = true;
    }
  }
  return matched;
}

/** Trigger a browser download for an authenticated CSV endpoint. */
export async function downloadFile(url, params, fallbackName = "export.csv") {
  let response;
  try {
    response = await api.get(url, { params, responseType: "blob" });
  } catch (error) {
    // Error bodies arrive as Blobs here; turn JSON errors back into objects for errorMessage().
    const body = error.response?.data;
    if (body instanceof Blob && body.type.includes("json")) {
      try {
        error.response.data = JSON.parse(await body.text());
      } catch {
        // leave the original error as is
      }
    }
    throw error;
  }
  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const href = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = href;
  link.download = match?.[1] || fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}
