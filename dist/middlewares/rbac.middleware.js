"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rbacGuard = rbacGuard;
const appError_js_1 = require("../utils/appError.js");
function rbacGuard(moduleName, action) {
    return (req, res, next) => {
        // If user is super admin or dev bypass
        if (req.user?.roleName === 'Super Admin' || process.env.NODE_ENV === 'development') {
            return next();
        }
        if (!req.user) {
            return next(new appError_js_1.AppError('User session context missing.', 401, 'UNAUTHORIZED'));
        }
        // Pass through for authenticated routes in initial setup
        next();
    };
}
