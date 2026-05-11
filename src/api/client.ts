/**
 * Base HTTP client for ReTouch mobile.
 *
 * - Reads access token from session storage on every request (no in-memory cache
 *   so a refreshed token is always used).
 * - Throws UnauthorizedError on 401 so the auth store can trigger logout.
 * - Supports multipart/form-data uploads (pass FormData as body).
 */
import { getSessionItem } from '../lib/sessionStorage';

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

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: FormData | string | null;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, skipAuth = false } = options;

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

export const api = {
  get: <T>(path: string, headers?: Record<string, string>) =>
    request<T>(path, { headers }),

  post: <T>(path: string, body: FormData | string, headers?: Record<string, string>) =>
    request<T>(path, { method: 'POST', body, headers }),

  patch: <T>(path: string, body: string, headers?: Record<string, string>) =>
    request<T>(path, { method: 'PATCH', body, headers }),
};
