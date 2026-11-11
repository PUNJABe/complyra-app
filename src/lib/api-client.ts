const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");

export function apiFetch(path: `/api/${string}`, init?: RequestInit) {
  const url = apiBaseUrl ? new URL(path, `${apiBaseUrl}/`).toString() : path;
  return fetch(url, { ...init, credentials: "include" });
}
