"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jwt_js_1 = require("../utils/jwt.js");
const appError_js_1 = require("../utils/appError.js");
const tenantContext_js_1 = require("../utils/tenantContext.js");
const database_js_1 = __importDefault(require("../config/database.js"));
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new appError_js_1.AppError('Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED'));
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = (0, jwt_js_1.verifyAccessToken)(token);
        req.user = payload;
        const resolveContext = async () => {
            let tenantId;
            let ownerId;
            let staffId;
            const roleLower = (payload.roleName || '').toLowerCase();
            if (roleLower.includes('tenant') || roleLower.includes('resident')) {
                const tenant = await database_js_1.default.tenant.findUnique({ where: { email: payload.email } });
                if (tenant)
                    tenantId = tenant.id;
            }
            else if (roleLower.includes('owner') || roleLower.includes('landlord')) {
                const owner = await database_js_1.default.owner.findUnique({ where: { email: payload.email } });
                if (owner)
                    ownerId = owner.id;
            }
            else if (roleLower.includes('maintenance') || roleLower.includes('staff')) {
                const staff = await database_js_1.default.staffProfile.findUnique({ where: { email: payload.email } });
                if (staff)
                    staffId = staff.id;
            }
            tenantContext_js_1.tenantContext.run({
                userId: payload.userId,
                companyId: payload.companyId,
                role: payload.roleName,
                tenantId,
                ownerId,
                staffId
            }, () => {
                next();
            });
        };
        resolveContext().catch((err) => next(err));
    }
    catch (error) {
        return next(new appError_js_1.AppError('Invalid or expired access token.', 401, 'TOKEN_EXPIRED'));
    }
}
