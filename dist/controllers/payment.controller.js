"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentController = exports.PaymentController = void 0;
const payment_service_1 = require("../services/payment.service");
const apiResponse_1 = require("../utils/apiResponse");
class PaymentController {
    async getAll(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const payments = await payment_service_1.paymentService.getAllPayments(companyId, req.user);
            return (0, apiResponse_1.sendSuccess)({ res, data: payments });
        }
        catch (error) {
            next(error);
        }
    }
    async processPayment(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const payment = await payment_service_1.paymentService.processPayment({
                ...req.body,
                companyId,
                userEmail: req.user?.email,
                userRole: req.user?.roleName || req.user?.role,
            });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: payment });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PaymentController = PaymentController;
exports.paymentController = new PaymentController();
