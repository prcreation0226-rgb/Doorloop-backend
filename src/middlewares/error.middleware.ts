import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError.js';
import { sendError } from '../utils/apiResponse.js';
import { logger } from '../config/logger.js';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = (req.headers['x-request-id'] as string) || '';

  if (err instanceof AppError) {
    logger.warn({ err, requestId }, `Operational Error: ${err.message}`);
    return sendError({
      res,
      statusCode: err.statusCode,
      message: err.message,
      code: err.code,
      details: err.details,
      requestId,
    });
  }

  logger.error({ err, requestId }, `Unhandled Exception: ${err.message}`);
  return sendError({
    res,
    statusCode: 500,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    code: 'INTERNAL_SERVER_ERROR',
    requestId,
  });
}
