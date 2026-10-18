import type { ApiErrorBody } from '@gitlab-tools/shared';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export function isAbort(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'ABORTED';
}

export function toMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong.';
}

export function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return apiSend<T>(path, { signal });
}

export function apiPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return apiSend<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
}

async function apiSend<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch (error) {
    if (isAbortError(error)) throw new ApiError('Request cancelled.', 'ABORTED', 0);
    throw new ApiError('Cannot reach the GitLab Tools API. Start it with npm run dev.', 'API_UNREACHABLE', 0);
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const body = isApiErrorBody(payload) ? payload : null;
    throw new ApiError(
      body?.error.message ?? `Request failed (${response.status}).`,
      body?.error.code ?? 'HTTP_ERROR',
      response.status,
    );
  }
  return payload as T;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (!value || typeof value !== 'object') return false;
  const error = (value as { error?: unknown }).error;
  if (!error || typeof error !== 'object') return false;
  const record = error as { code?: unknown; message?: unknown };
  return typeof record.code === 'string' && typeof record.message === 'string';
}
