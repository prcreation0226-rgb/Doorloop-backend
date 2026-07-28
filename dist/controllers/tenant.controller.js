"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantController = exports.TenantController = void 0;
const database_js_1 = __importDefault(require("../config/database.js"));
const apiResponse_js_1 = require("../utils/apiResponse.js");
const appError_js_1 = require("../utils/appError.js");
class TenantController {
    async getAll(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const tenants = await database_js_1.default.tenant.findMany({
                where: companyId ? { companyId } : {},
                include: {
                    unit: {
                        include: {
                            property: true,
                        },
                    },
                    leases: true,
                },
            });
            return (0, apiResponse_js_1.sendSuccess)({ res, data: tenants });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const { firstName, lastName, email, phone, unitId, status } = req.body;
            const companyId = req.user?.companyId;
            const tenant = await database_js_1.default.tenant.create({
                data: {
                    firstName,
                    lastName,
                    email,
                    phone,
                    unitId,
                    status: status || 'Pending',
                    companyId,
                },
            });
            return (0, apiResponse_js_1.sendSuccess)({ res, statusCode: 201, data: tenant });
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const tenant = await database_js_1.default.tenant.findFirst({
                where: companyId ? { id: req.params.id, companyId } : { id: req.params.id },
                include: {
                    unit: {
                        include: {
                            property: true,
                        },
                    },
                    leases: true,
                },
            });
            if (!tenant)
                throw new appError_js_1.AppError('Tenant not found.', 404, 'NOT_FOUND');
            return (0, apiResponse_js_1.sendSuccess)({ res, data: tenant });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const { firstName, lastName, email, phone, unitId, status } = req.body;
            const companyId = req.user?.companyId;
            if (companyId) {
                const tenant = await database_js_1.default.tenant.findFirst({
                    where: { id: req.params.id, companyId },
                });
                if (!tenant)
                    throw new appError_js_1.AppError('Tenant not found.', 404, 'NOT_FOUND');
            }
            const tenant = await database_js_1.default.tenant.update({
                where: { id: req.params.id },
                data: { firstName, lastName, email, phone, unitId, status },
            });
            return (0, apiResponse_js_1.sendSuccess)({ res, data: tenant });
        }
        catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            if (companyId) {
                const tenant = await database_js_1.default.tenant.findFirst({
                    where: { id: req.params.id, companyId },
                });
                if (!tenant)
                    throw new appError_js_1.AppError('Tenant not found.', 404, 'NOT_FOUND');
            }
            await database_js_1.default.tenant.delete({
                where: { id: req.params.id },
            });
            return (0, apiResponse_js_1.sendSuccess)({ res, data: { success: true } });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.TenantController = TenantController;
exports.tenantController = new TenantController();
