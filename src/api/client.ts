/**
 * Base HTTP client for ReTouch mobile.
 *
 * - Reads access token from session storage on every request (no in-memory cache
 *   so a refreshed token is always used).
 * - On 401: silently tries to refresh the access token once, retries the request,
 *   then throws UnauthorizedError if still unauthorized (triggers logout).
 * - Supports multipart/form-data uploads (pass FormData as body).
 */
import { getSessionItem, setSessionItem } from '../lib/sessionStorage';

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor() {
    super(401, 'Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await getSessionItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/** Try to get a fresh access token using the stored refresh token.
 *  Returns the new access token on success, null on failure. */
async function silentRefresh(): Promise<string | null> {
  try {
    const refreshToken = await getSessionItem('refresh_token');
    if (!refreshToken) return null;
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string };
    await setSessionItem('access_token', data.access_token);
    return data.access_token;
  } catch {
    return null;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: FormData | string | null;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  _retried?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, skipAuth = false, _retried = false } = options;

  const authHeaders = skipAuth ? {} : await getAuthHeader();
  const isFormData = body instanceof FormData;

  const fetchHeaders: Record<string, string> = {
    ...authHeaders,
    ...headers,
    // Don't set Content-Type for FormData — fetch sets it automatically with boundary
    ...(!isFormData && body ? { 'Content-Type': 'application/json' } : {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: fetchHeaders,
    body: body ?? undefined,
  });

  if (response.status === 401) {
    // Attempt a silent token refresh once, then retry the original request
    if (!skipAuth && !_retried) {
      const newToken = await silentRefresh();
      if (newToken) {
        return request<T>(path, { ...options, _retried: true });
      }
    }
    throw new UnauthorizedError();
  }

  let data: unknown;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'message' in data
        ? String((data as { message: unknown }).message)
        : `HTTP ${response.status}`;
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

/** Authenticated fetch that returns the raw Response (for file downloads). */
export async function download(path: string): Promise<Response> {
  const authHeaders = await getAuthHeader();
  const response = await fetch(`${API_BASE}${path}`, { headers: authHeaders });
  if (response.status === 401) {
    const newToken = await silentRefresh();
    if (newToken) {
      const retried = await fetch(`${API_BASE}${path}`, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      if (!retried.ok) throw new ApiError(retried.status, `HTTP ${retried.status}`);
      return retried;
    }
    throw new UnauthorizedError();
  }
  if (!response.ok) throw new ApiError(response.status, `HTTP ${response.status}`);
  return response;
}

export const api = {
  get: <T>(path: string, headers?: Record<string, string>) =>
    request<T>(path, { headers }),

  post: <T>(path: string, body: FormData | string, headers?: Record<string, string>) =>
    request<T>(path, { method: 'POST', body, headers }),

  patch: <T>(path: string, body: string, headers?: Record<string, string>) =>
    request<T>(path, { method: 'PATCH', body, headers }),
};
