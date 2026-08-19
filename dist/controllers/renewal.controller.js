"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renewalController = exports.RenewalController = void 0;
const renewal_service_1 = require("../services/renewal.service");
const apiResponse_1 = require("../utils/apiResponse");
class RenewalController {
    async getAll(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const renewals = await renewal_service_1.renewalService.getAllRenewals(companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: renewals });
        }
        catch (error) {
            next(error);
        }
    }
    async sendOffer(req, res, next) {
        try {
            const { leaseId } = req.body;
            if (!leaseId)
                return res.status(400).json({ error: 'leaseId is required' });
            const result = await renewal_service_1.renewalService.sendOffer(leaseId);
            return (0, apiResponse_1.sendSuccess)({ res, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const { leaseId, newRentAmount, termMonths, newEndDate } = req.body;
            if (!leaseId)
                return res.status(400).json({ error: 'leaseId is required' });
            const result = await renewal_service_1.renewalService.updateRenewal(leaseId, { newRentAmount, termMonths, newEndDate });
            return (0, apiResponse_1.sendSuccess)({ res, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async accept(req, res, next) {
        try {
            const { leaseId, termMonths } = req.body;
            if (!leaseId)
                return res.status(400).json({ error: 'leaseId is required' });
            const companyId = req.user?.companyId;
            const result = await renewal_service_1.renewalService.acceptRenewal(leaseId, companyId, termMonths);
            return (0, apiResponse_1.sendSuccess)({ res, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async reject(req, res, next) {
        try {
            const { leaseId } = req.body;
            if (!leaseId)
                return res.status(400).json({ error: 'leaseId is required' });
            const companyId = req.user?.companyId;
            const result = await renewal_service_1.renewalService.rejectRenewal(leaseId, companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.RenewalController = RenewalController;
exports.renewalController = new RenewalController();
