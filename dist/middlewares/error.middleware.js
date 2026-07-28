"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const appError_js_1 = require("../utils/appError.js");
const apiResponse_js_1 = require("../utils/apiResponse.js");
const logger_js_1 = require("../config/logger.js");
function errorHandler(err, req, res, next) {
    const requestId = req.headers['x-request-id'] || '';
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
    logger_js_1.logger.error({ err, requestId }, `Unhandled Exception: ${err.message}`);
    return (0, apiResponse_js_1.sendError)({
        res,
        statusCode: 500,
        message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
        code: 'INTERNAL_SERVER_ERROR',
        requestId,
    });
}
