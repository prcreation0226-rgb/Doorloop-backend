"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantController = exports.TenantController = void 0;
const database_js_1 = __importDefault(require("../config/database.js"));
const apiResponse_js_1 = require("../utils/apiResponse.js");
const appError_js_1 = require("../utils/appError.js");
const bcrypt_1 = __importDefault(require("bcrypt"));
const cloudinary_js_1 = __importDefault(require("../config/cloudinary.js"));
const companyHelper_js_1 = require("../utils/companyHelper.js");
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
                    screeningReports: true,
                    invoices: true,
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
            const { firstName, lastName, email, phone, unitId, status, password } = req.body;
            const companyId = await (0, companyHelper_js_1.getManagerCompanyId)(req, req.body.companyId || req.user?.companyId);
            const file = req.file;
            let imageUrl = null;
            if (file) {
                try {
                    imageUrl = await new Promise((resolve, reject) => {
                        const uploadStream = cloudinary_js_1.default.uploader.upload_stream({ folder: 'talent' }, (error, result) => {
                            if (error)
                                return reject(error);
                            resolve(result?.secure_url || '');
                        });
                        uploadStream.end(file.buffer);
                    });
                }
                catch (err) {
                    console.error('Cloudinary tenant photo upload failed:', err);
                }
            }
            if (unitId && companyId) {
                const unit = await database_js_1.default.unit.findFirst({
                    where: { id: unitId, property: { companyId } },
                });
                if (!unit) {
                    throw new appError_js_1.AppError('Unit not found.', 404, 'NOT_FOUND');
                }
            }
            const tenant = await database_js_1.default.tenant.create({
                data: {
                    firstName,
                    lastName,
                    email,
                    phone,
                    unitId,
                    status: status || 'Pending',
                    imageUrl,
                    companyId,
                },
            });
            if (password) {
                let role = await database_js_1.default.role.findUnique({
                    where: { name: 'Tenant' },
                });
                if (!role) {
                    role = await database_js_1.default.role.findFirst();
                }
                if (role) {
                    const passwordHash = await bcrypt_1.default.hash(password, 12);
                    await database_js_1.default.user.create({
                        data: {
                            email,
                            passwordHash,
                            firstName: firstName || 'Tenant',
                            lastName: lastName || 'User',
                            phone: phone || null,
                            roleId: role.id,
                            companyId,
                        },
                    });
                }
            }
            return (0, apiResponse_js_1.sendSuccess)({ res, statusCode: 201, data: tenant });
        }
        catch (error) {
            if (error?.code === 'P2002' || error?.message?.includes('Unique constraint')) {
                return next(new appError_js_1.AppError('Email address is already registered.', 400, 'DUPLICATE_EMAIL'));
            }
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
                    invoices: true,
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
            const { firstName, lastName, email, phone, unitId, status, password } = req.body;
            const companyId = req.user?.companyId;
            const id = req.params.id;
            const file = req.file;
            const oldTenant = await database_js_1.default.tenant.findFirst({
                where: companyId ? { id, companyId } : { id },
            });
            if (!oldTenant)
                throw new appError_js_1.AppError('Tenant not found.', 404, 'NOT_FOUND');
            if (unitId && companyId) {
                const unit = await database_js_1.default.unit.findFirst({
                    where: { id: unitId, property: { companyId } },
                });
                if (!unit) {
                    throw new appError_js_1.AppError('Unit not found.', 404, 'NOT_FOUND');
                }
            }
            let imageUrl = oldTenant.imageUrl;
            if (file) {
                try {
                    imageUrl = await new Promise((resolve, reject) => {
                        const uploadStream = cloudinary_js_1.default.uploader.upload_stream({ folder: 'talent' }, (error, result) => {
                            if (error)
                                return reject(error);
                            resolve(result?.secure_url || '');
                        });
                        uploadStream.end(file.buffer);
                    });
                }
                catch (err) {
                    console.error('Cloudinary tenant photo upload failed:', err);
                }
            }
            const tenant = await database_js_1.default.tenant.update({
                where: { id },
                data: {
                    firstName,
                    lastName,
                    email,
                    phone,
                    unitId,
                    status,
                    imageUrl,
                },
            });
            if (password) {
                const passwordHash = await bcrypt_1.default.hash(password, 12);
                const existingUser = await database_js_1.default.user.findFirst({
                    where: { email: oldTenant.email },
                });
                if (existingUser) {
                    await database_js_1.default.user.update({
                        where: { id: existingUser.id },
                        data: {
                            email,
                            passwordHash,
                            firstName: firstName || undefined,
                            lastName: lastName || undefined,
                            phone,
                        },
                    });
                }
                else {
                    let role = await database_js_1.default.role.findUnique({
                        where: { name: 'Tenant' },
                    });
                    if (!role) {
                        role = await database_js_1.default.role.findFirst();
                    }
                    if (role) {
                        await database_js_1.default.user.create({
                            data: {
                                email,
                                passwordHash,
                                firstName: firstName || 'Tenant',
                                lastName: lastName || 'User',
                                phone: phone || null,
                                roleId: role.id,
                                companyId,
                            },
                        });
                    }
                }
            }
            return (0, apiResponse_js_1.sendSuccess)({ res, data: tenant });
        }
        catch (error) {
            if (error?.code === 'P2002' || error?.message?.includes('Unique constraint')) {
                return next(new appError_js_1.AppError('Email address is already registered.', 400, 'DUPLICATE_EMAIL'));
            }
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const id = req.params.id;
            const tenant = await database_js_1.default.tenant.findUnique({
                where: { id },
            });
            if (!tenant)
                throw new appError_js_1.AppError('Tenant not found.', 404, 'NOT_FOUND');
            if (companyId && tenant.companyId !== companyId) {
                throw new appError_js_1.AppError('Tenant not found.', 404, 'NOT_FOUND');
            }
            await database_js_1.default.$transaction(async (tx) => {
                // 1. Delete rent payments linked to tenant
                await tx.rentPayment.deleteMany({
                    where: { tenantId: id },
                });
                // 2. Delete invoices linked to tenant
                await tx.invoice.deleteMany({
                    where: { tenantId: id },
                });
                // 3. Delete leases linked to tenant (MoveIn, MoveOut, and LeaseRenewal have onDelete: Cascade with Lease)
                await tx.lease.deleteMany({
                    where: { tenantId: id },
                });
                // 4. Delete charges & deposits linked to tenant
                await tx.charge.deleteMany({
                    where: { tenantId: id },
                });
                await tx.deposit.deleteMany({
                    where: { tenantId: id },
                });
                // 5. Delete payment plans, screening reports, insurance policies
                await tx.paymentPlan.deleteMany({
                    where: { tenantId: id },
                });
                await tx.screeningReport.deleteMany({
                    where: { tenantId: id },
                });
                await tx.insurancePolicy.deleteMany({
                    where: { tenantId: id },
                });
                // 6. Delete login user
                if (tenant.email) {
                    await tx.user.deleteMany({
                        where: { email: tenant.email },
                    });
                }
                // 7. Finally, delete the Tenant itself
                await tx.tenant.delete({
                    where: { id },
                });
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
