"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jwt_js_1 = require("../utils/jwt.js");
const appError_js_1 = require("../utils/appError.js");
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new appError_js_1.AppError('Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED'));
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = (0, jwt_js_1.verifyAccessToken)(token);
        req.user = payload;
        next();
    }
    catch (error) {
        return next(new appError_js_1.AppError('Invalid or expired access token.', 401, 'TOKEN_EXPIRED'));
    }
}
