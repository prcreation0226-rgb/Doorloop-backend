"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const superadmin_service_1 = require("../services/superadmin.service");
const authorizeNet_service_1 = require("../services/authorizeNet.service");
const apiResponse_1 = require("../utils/apiResponse");
class AuthController {
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await auth_service_1.authService.login(email, password);
            return (0, apiResponse_1.sendSuccess)({ res, data: result, message: 'Authentication successful.' });
        }
        catch (error) {
            next(error);
        }
    }
    async register(req, res, next) {
        try {
            const result = await superadmin_service_1.superAdminService.createCompany(req.body);
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: result, message: 'Registration successful.' });
        }
        catch (error) {
            next(error);
        }
    }
    async refresh(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const result = await auth_service_1.authService.refreshToken(refreshToken);
            return (0, apiResponse_1.sendSuccess)({ res, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async changePassword(req, res, next) {
        try {
            const { currentPassword, newPassword } = req.body;
            const userEmail = req.user?.email;
            const result = await auth_service_1.authService.changePassword(userEmail, currentPassword, newPassword);
            return (0, apiResponse_1.sendSuccess)({ res, data: result, message: 'Password changed successfully.' });
        }
        catch (error) {
            next(error);
        }
    }
    async getPublicPlans(req, res, next) {
        try {
            const plans = await superadmin_service_1.superAdminService.getPlans();
            return (0, apiResponse_1.sendSuccess)({ res, data: plans });
        }
        catch (error) {
            next(error);
        }
    }
    async createHostedPayment(req, res, next) {
        try {
            const { amount, planName, description } = req.body;
            const result = await authorizeNet_service_1.authorizeNetService.getHostedPaymentToken({
                amount: Number(amount) || 99,
                planName: planName || 'Subscription Plan',
                description: description || `SaaS Subscription Plan: ${planName}`,
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: result, message: 'Hosted payment token generated successfully.' });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
