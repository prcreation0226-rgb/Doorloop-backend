"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rbacGuard = rbacGuard;
const appError_js_1 = require("../utils/appError.js");
const database_js_1 = __importDefault(require("../config/database.js"));
function rbacGuard(moduleName, action) {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return next(new appError_js_1.AppError('User session context missing.', 401, 'UNAUTHORIZED'));
            }
            // Bypass checks for Super Admin
            if (req.user.roleName === 'Super Admin') {
                return next();
            }
            const roleId = req.user.roleId;
            if (!roleId) {
                // Tenants, Owners and Maintenance staff do not use RBAC roles table, so they bypass this guard
                return next();
            }
            // Query permission matrix for this role and module
            const permission = await database_js_1.default.permission.findFirst({
                where: {
                    roleId,
                    module: moduleName
                }
            });
            if (!permission) {
                return next(new appError_js_1.AppError(`Access denied. Permissions not configured for the ${moduleName} module.`, 403, 'FORBIDDEN'));
            }
            let hasAccess = false;
            switch (action) {
                case 'view':
                    hasAccess = permission.canView;
                    break;
                case 'create':
                    hasAccess = permission.canCreate;
                    break;
                case 'edit':
                    hasAccess = permission.canEdit;
                    break;
                case 'delete':
                    hasAccess = permission.canDelete;
                    break;
                case 'approve':
                    hasAccess = permission.canApprove;
                    break;
                case 'export':
                    hasAccess = permission.canExport;
                    break;
                default:
                    hasAccess = false;
            }
            if (!hasAccess) {
                return next(new appError_js_1.AppError(`Permission denied. You are not authorized to ${action} in the ${moduleName} module.`, 403, 'FORBIDDEN'));
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
