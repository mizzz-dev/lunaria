// =============================================
// Lunaria Bot – Internal API Client
// =============================================

import { fetch } from 'undici';

const API_BASE_URL = process.env['API_BASE_URL'];
const BOT_INTERNAL_SECRET = process.env['BOT_INTERNAL_SECRET'];

if (!API_BASE_URL) {
  throw new Error('[api-client] API_BASE_URL environment variable is not set.');
}
if (!BOT_INTERNAL_SECRET) {
  throw new Error('[api-client] BOT_INTERNAL_SECRET environment variable is not set.');
}

class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function buildUrl(path: string): string {
  const base = API_BASE_URL!.replace(/\/$/, '');
  const normalised = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalised}`;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${BOT_INTERNAL_SECRET!}`,
    'Content-Type': 'application/json',
  };
}

async function handleResponse<T>(response: Awaited<ReturnType<typeof fetch>>): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  let body: unknown;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  if (!response.ok) {
    const errBody = body as { error?: { code?: string; message?: string } };
    const code = errBody?.error?.code ?? 'UNKNOWN_ERROR';
    const message = errBody?.error?.message ?? `HTTP ${response.status}`;
    throw new ApiError(response.status, code, message);
  }

  // Unwrap API envelope if present
  const envelope = body as { success?: boolean; data?: T };
  if (typeof envelope === 'object' && envelope !== null && 'success' in envelope) {
    if (!envelope.success) {
      const errEnvelope = body as { error?: { code?: string; message?: string } };
      throw new ApiError(
        response.status,
        errEnvelope?.error?.code ?? 'API_ERROR',
        errEnvelope?.error?.message ?? 'API returned success: false',
      );
    }
    return envelope.data as T;
  }

  return body as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: 'GET',
    headers: authHeaders(),
  });
  return handleResponse<T>(response);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

export async function apiDelete(path: string): Promise<void> {
  const response = await fetch(buildUrl(path), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await handleResponse<void>(response);
}
