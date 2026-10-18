export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof HttpError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Unknown error';
}
