"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = __importDefault(require("../config/database"));
const jwt_1 = require("../utils/jwt");
const appError_1 = require("../utils/appError");
class AuthService {
    async login(email, pass) {
        let user = await database_1.default.user.findUnique({
            where: { email },
            include: { role: true, company: true },
        });
        if (!user) {
            throw new appError_1.AppError('Invalid credentials provided.', 401, 'INVALID_CREDENTIALS');
        }
        if (user.status !== 'Active') {
            throw new appError_1.AppError('Your account has been deactivated. Please contact support.', 403, 'USER_DEACTIVATED');
        }
        if (user.companyId && user.company) {
            if (user.company.status !== 'Active') {
                throw new appError_1.AppError('Your company account is suspended. Please contact support.', 403, 'COMPANY_SUSPENDED');
            }
        }
        const isValidPassword = await bcrypt_1.default.compare(pass, user.passwordHash).catch(() => false);
        if (!isValidPassword) {
            throw new appError_1.AppError('Invalid credentials provided.', 401, 'INVALID_CREDENTIALS');
        }
        const payload = {
            userId: user.id,
            email: user.email,
            roleId: user.roleId,
            roleName: user.role?.name || 'Super Admin',
            companyId: user.companyId || undefined,
        };
        const accessToken = (0, jwt_1.generateAccessToken)(payload);
        const refreshToken = (0, jwt_1.generateRefreshToken)(payload);
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                roleId: user.roleId,
                roleName: user.role?.name || 'Super Admin',
                companyId: user.companyId,
            },
            accessToken,
            refreshToken,
        };
    }
    async refreshToken(token) {
        if (!token)
            throw new appError_1.AppError('Refresh token required.', 400, 'BAD_REQUEST');
        try {
            const decoded = (0, jwt_1.verifyRefreshToken)(token);
            const newAccessToken = (0, jwt_1.generateAccessToken)({
                userId: decoded.userId,
                email: decoded.email,
                roleId: decoded.roleId,
                roleName: decoded.roleName,
                companyId: decoded.companyId,
            });
            return { accessToken: newAccessToken };
        }
        catch (err) {
            throw new appError_1.AppError(err.message || 'Invalid or expired refresh token.', 401, 'UNAUTHORIZED');
        }
    }
    async changePassword(userEmail, currentPass, newPass) {
        if (!userEmail) {
            throw new appError_1.AppError('Authentication email is required.', 401, 'UNAUTHORIZED');
        }
        if (!currentPass) {
            throw new appError_1.AppError('Current password is required.', 400, 'BAD_REQUEST');
        }
        if (!newPass || newPass.length < 6) {
            throw new appError_1.AppError('New password must be at least 6 characters.', 400, 'BAD_REQUEST');
        }
        const user = await database_1.default.user.findFirst({
            where: userEmail ? { email: userEmail } : undefined,
        });
        if (!user) {
            throw new appError_1.AppError('User not found.', 404, 'NOT_FOUND');
        }
        const isPasswordValid = await bcrypt_1.default.compare(currentPass, user.passwordHash);
        if (!isPasswordValid) {
            throw new appError_1.AppError('Incorrect current password.', 400, 'INVALID_PASSWORD');
        }
        const hashedPassword = await bcrypt_1.default.hash(newPass, 10);
        await database_1.default.user.update({
            where: { id: user.id },
            data: { passwordHash: hashedPassword },
        });
        return { message: 'Password updated successfully in database.' };
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
