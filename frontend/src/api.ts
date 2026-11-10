/**
 * Central fetch wrapper for the MyRinggit API.
 * Attaches the JWT token (if present) and resolves the backend base URL.
 */

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "https://my-ringgit.vercel.app/api";

const TOKEN_KEY = "myringgit_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getTokenRole(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const payload: { role?: string } = JSON.parse(
      atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/")),
    );
    return payload.role ?? null;
  } catch {
    return null;
  }
}

/** Returns the message of an Error, or the fallback for anything else / an empty message. */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * Reads the `detail` field FastAPI puts on error responses. Handles both a
 * plain string (HTTPException) and the list of `{ msg }` objects used for
 * validation errors (422). Falls back to the given message if the body isn't
 * JSON or has no usable detail.
 */
export async function readErrorDetail(response: Response, fallback: string): Promise<string> {
  try {
    const body: { detail?: unknown } = await response.json();
    const { detail } = body;
    if (typeof detail === "string" && detail) return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => (typeof item === "object" && item !== null && "msg" in item ? String(item.msg) : ""))
        .filter(Boolean);
      if (messages.length > 0) return messages.join("; ");
    }
  } catch {
    // response body wasn't JSON, keep the fallback message
  }
  return fallback;
}

/**
 * Makes a request to the API, attaching the JWT token and JSON headers.
 * On a 401 response, the stored token is cleared and the user is
 * redirected to the login page.
 *
 * The response body is parsed as JSON and returned as `T`; empty responses
 * (e.g. 204 No Content) resolve to `null`, so only use a non-void `T` for
 * endpoints that return a body.
 *
 * @param path - API path, e.g. "/auth/login" (relative to API_BASE_URL)
 * @param options - fetch options (method, body, etc.)
 */
async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    if (!window.location.pathname.endsWith("login.html")) {
      window.location.href = "login.html";
    }
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    throw new Error(await readErrorDetail(response, `Request failed with status ${response.status}`));
  }

  if (response.status === 204) {
    return null as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path: string) => apiRequest<void>(path, { method: "DELETE" }),
};