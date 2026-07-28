import { Response } from 'express';

export interface ApiResponseOptions<T> {
  res: Response;
  statusCode?: number;
  data?: T;
  meta?: Record<string, any>;
  message?: string;
  requestId?: string;
}

export function sendSuccess<T>({
  res,
  statusCode = 200,
  data,
  meta,
  requestId,
}: ApiResponseOptions<T>) {
  const reqId = requestId || (res.req?.headers['x-request-id'] as string) || '';
  return res.status(statusCode).json({
    success: true,
    data: data || null,
    meta: meta || undefined,
    timestamp: new Date().toISOString(),
    requestId: reqId,
  });
}

export function sendError({
  res,
  statusCode = 500,
  message = 'Internal Server Error',
  code = 'INTERNAL_ERROR',
  details,
  requestId,
}: {
  res: Response;
  statusCode?: number;
  message?: string;
  code?: string;
  details?: any;
  requestId?: string;
}) {
  const reqId = requestId || (res.req?.headers['x-request-id'] as string) || '';
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
    requestId: reqId,
  });
}
