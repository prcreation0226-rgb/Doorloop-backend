"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function sendSuccess({ res, statusCode = 200, data, meta, requestId, }) {
    const reqId = requestId || res.req?.headers['x-request-id'] || '';
    return res.status(statusCode).json({
        success: true,
        data: data || null,
        meta: meta || undefined,
        timestamp: new Date().toISOString(),
        requestId: reqId,
    });
}
function sendError({ res, statusCode = 500, message = 'Internal Server Error', code = 'INTERNAL_ERROR', details, requestId, }) {
    const reqId = requestId || res.req?.headers['x-request-id'] || '';
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
