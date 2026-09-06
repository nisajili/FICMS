import type { ApiResponse } from '@ficms/types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${BASE}${path}`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '' && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/**
 * API client. Uses httpOnly cookies (credentials: 'include') for auth. On
 * 401 it attempts a refresh, then re-issues the request once for resilience.
 */
async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { query, headers, body, ...rest } = opts;
  const url = buildUrl(path, query);
  const isForm = body instanceof FormData;
  const jsonBody = isForm ? (body as BodyInit) : body && typeof body === 'object' ? JSON.stringify(body) : (body as BodyInit | undefined);
  const headersFor = () => ({ ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...headers });
  const res = await fetch(url, {
    ...rest,
    credentials: 'include',
    headers: headersFor(),
    body: jsonBody,
  });

  if (res.status === 401) {
    await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' }).catch(() => null);
    const retry = await fetch(url, {
      ...rest,
      credentials: 'include',
      headers: headersFor(),
      body: jsonBody,
    });
    const json = (await retry.json()) as ApiResponse<T>;
    if (json.success) return json.data;
    throw new ApiClientError(json);
  }

  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) throw new ApiClientError(json);
  return json.data;
}

export class ApiClientError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;
  fieldErrors?: Record<string, string[]>;
  constructor(payload: Extract<ApiResponse<never>, { success: false }>) {
    super(payload.message);
    this.statusCode = payload.statusCode;
    this.code = payload.code;
    this.details = payload.details;
    this.fieldErrors = payload.fieldErrors;
  }
}

export const api = {
  get: <T = any>(path: string, query?: RequestOptions['query']) => request<T>(path, { method: 'GET', query }),
  post: <T = any>(path: string, body?: unknown, query?: RequestOptions['query']) => request<T>(path, { method: 'POST', body, query }),
  patch: <T = any>(path: string, body?: unknown, query?: RequestOptions['query']) => request<T>(path, { method: 'PATCH', body, query }),
  put: <T = any>(path: string, body?: unknown, query?: RequestOptions['query']) => request<T>(path, { method: 'PUT', body, query }),
  delete: <T = any>(path: string, query?: RequestOptions['query']) => request<T>(path, { method: 'DELETE', query }),
};

export { BASE as API_BASE };
