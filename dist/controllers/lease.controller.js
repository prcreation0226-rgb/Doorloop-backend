"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaseController = exports.LeaseController = void 0;
const lease_service_1 = require("../services/lease.service");
const apiResponse_1 = require("../utils/apiResponse");
class LeaseController {
    async getAll(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const leases = await lease_service_1.leaseService.getAllLeases(companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: leases });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const lease = await lease_service_1.leaseService.createLease({ ...req.body, companyId });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: lease });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const lease = await lease_service_1.leaseService.updateLease(req.params.id, req.body, companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: lease });
        }
        catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            await lease_service_1.leaseService.deleteLease(req.params.id, companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: { success: true } });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.LeaseController = LeaseController;
exports.leaseController = new LeaseController();
