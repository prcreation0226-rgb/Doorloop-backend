"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const appError_js_1 = require("../utils/appError.js");
const apiResponse_js_1 = require("../utils/apiResponse.js");
const logger_js_1 = require("../config/logger.js");
function errorHandler(err, req, res, next) {
    const requestId = req.headers['x-request-id'] || '';
    const errMsg = err.message || '';
    const lowerMsg = errMsg.toLowerCase();
    // Intercept Prisma and DB unique constraint errors and translate to clean messages
    if (lowerMsg.includes('unique constraint failed') ||
        lowerMsg.includes('email_key') ||
        lowerMsg.includes('code_key') ||
        err.code === 'P2002') {
        let cleanMessage = 'A record with duplicate unique fields already exists.';
        if (lowerMsg.includes('email')) {
            cleanMessage = 'Email address is already registered.';
        }
        else if (lowerMsg.includes('code_key') || lowerMsg.includes('code')) {
            cleanMessage = 'Company code is already taken.';
        }
        logger_js_1.logger.warn({ err, requestId }, `Unique Constraint Error Transformed: ${cleanMessage}`);
        return (0, apiResponse_js_1.sendError)({
            res,
            statusCode: 400,
            message: cleanMessage,
            code: 'DUPLICATE_ENTRY',
            requestId,
        });
    }
    if (err instanceof appError_js_1.AppError) {
        logger_js_1.logger.warn({ err, requestId }, `Operational Error: ${err.message}`);
        return (0, apiResponse_js_1.sendError)({
            res,
            statusCode: err.statusCode,
            message: err.message,
            code: err.code,
            details: err.details,
            requestId,
        });
    }
    // Treat generic developer-thrown Error objects as operational 400 errors
    if (err.name === 'Error' || err.isOperational) {
        logger_js_1.logger.warn({ err, requestId }, `Operational Generic Error: ${err.message}`);
        const statusCode = err.statusCode || 400;
        return (0, apiResponse_js_1.sendError)({
            res,
            statusCode,
            message: err.message,
            code: err.code || 'BAD_REQUEST',
            details: err.details,
            requestId,
        });
    }
    logger_js_1.logger.error({ err, requestId }, `Unhandled Exception: ${err.message}`);
    return (0, apiResponse_js_1.sendError)({
        res,
        statusCode: 500,
        message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
        code: 'INTERNAL_SERVER_ERROR',
        requestId,
    });
}
