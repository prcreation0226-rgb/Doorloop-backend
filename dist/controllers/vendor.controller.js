"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vendorController = exports.VendorController = void 0;
const database_1 = __importDefault(require("../config/database"));
const apiResponse_1 = require("../utils/apiResponse");
const bcrypt_1 = __importDefault(require("bcrypt"));
const companyHelper_1 = require("../utils/companyHelper");
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
            // Fetch matching login users to attach their status
            const emails = vendors.map((v) => v.email).filter(Boolean);
            const matchedUsers = await database_1.default.user.findMany({
                where: {
                    email: { in: emails },
                    companyId: companyId || undefined,
                },
            });
            const vendorsWithStatus = vendors.map((v) => {
                const userRec = matchedUsers.find((u) => u.email === v.email);
                return {
                    ...v,
                    status: userRec ? userRec.status : 'Active',
                };
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: vendorsWithStatus });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const { companyName, contactName, email, phone, serviceType, rating, password } = req.body;
            const companyId = await (0, companyHelper_1.getManagerCompanyId)(req, req.body.companyId || req.user?.companyId);
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
            // Automatically create matching login user for this vendor (Maintenance Staff role)
            if (email) {
                const roleObj = await database_1.default.role.findFirst({
                    where: { name: 'Maintenance Staff' },
                });
                if (roleObj) {
                    const existingUser = await database_1.default.user.findUnique({
                        where: { email },
                    });
                    if (!existingUser) {
                        const passwordHash = await bcrypt_1.default.hash(password || 'vendor123', 12);
                        const nameParts = (contactName || companyName || 'Vendor').trim().split(/\s+/);
                        const firstName = nameParts[0] || 'Vendor';
                        const lastName = nameParts.slice(1).join(' ') || 'Partner';
                        await database_1.default.user.create({
                            data: {
                                email,
                                passwordHash,
                                firstName,
                                lastName,
                                phone: phone || '',
                                roleId: roleObj.id,
                                companyId,
                            },
                        });
                    }
                    else if (!existingUser.companyId) {
                        await database_1.default.user.update({
                            where: { id: existingUser.id },
                            data: { companyId },
                        });
                    }
                }
            }
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
