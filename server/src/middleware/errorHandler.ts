import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../infrastructure/httpError.ts';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) return;

  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }

  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Request body must be valid JSON.' },
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    error: { code: 'INTERNAL', message: 'Unexpected server error.' },
  });
}
