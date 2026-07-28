"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vendorController = exports.VendorController = void 0;
const database_1 = __importDefault(require("../config/database"));
const apiResponse_1 = require("../utils/apiResponse");
class VendorController {
    async getAll(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const vendors = await database_1.default.vendor.findMany({
                where: companyId ? { companyId } : {},
                include: {
                    workOrders: true,
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: vendors });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const { companyName, contactName, email, phone, serviceType, rating } = req.body;
            const companyId = req.user?.companyId;
            const vendor = await database_1.default.vendor.create({
                data: {
                    companyName,
                    contactName,
                    email,
                    phone,
                    serviceType,
                    rating: rating || 5.0,
                    companyId,
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: vendor });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const { companyName, contactName, email, phone, serviceType, rating } = req.body;
            const id = req.params.id;
            const companyId = req.user?.companyId;
            if (companyId) {
                const check = await database_1.default.vendor.findFirst({
                    where: { id, companyId },
                });
                if (!check)
                    throw new Error('Vendor not found.');
            }
            const vendor = await database_1.default.vendor.update({
                where: { id },
                data: { companyName, contactName, email, phone, serviceType, rating },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: vendor });
        }
        catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const id = req.params.id;
            const companyId = req.user?.companyId;
            if (companyId) {
                const check = await database_1.default.vendor.findFirst({
                    where: { id, companyId },
                });
                if (!check)
                    throw new Error('Vendor not found.');
            }
            await database_1.default.vendor.delete({
                where: { id },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: { success: true } });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.VendorController = VendorController;
exports.vendorController = new VendorController();
