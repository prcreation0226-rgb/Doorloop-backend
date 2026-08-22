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

  const errMsg = err.message || '';
  const lowerMsg = errMsg.toLowerCase();

  // Intercept Prisma and DB unique constraint errors and translate to clean messages
  if (
    lowerMsg.includes('unique constraint failed') || 
    lowerMsg.includes('email_key') || 
    lowerMsg.includes('code_key') ||
    (err as any).code === 'P2002'
  ) {
    let cleanMessage = 'A record with duplicate unique fields already exists.';
    if (lowerMsg.includes('email')) {
      cleanMessage = 'Email address is already registered.';
    } else if (lowerMsg.includes('code_key') || lowerMsg.includes('code')) {
      cleanMessage = 'Company code is already taken.';
    }

    logger.warn({ err, requestId }, `Unique Constraint Error Transformed: ${cleanMessage}`);
    return sendError({
      res,
      statusCode: 400,
      message: cleanMessage,
      code: 'DUPLICATE_ENTRY',
      requestId,
    });
  }

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

  // Treat generic developer-thrown Error objects as operational 400 errors
  if (err.name === 'Error' || (err as any).isOperational) {
    logger.warn({ err, requestId }, `Operational Generic Error: ${err.message}`);
    const statusCode = (err as any).statusCode || 400;
    return sendError({
      res,
      statusCode,
      message: err.message,
      code: (err as any).code || 'BAD_REQUEST',
      details: (err as any).details,
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
