"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ownerController = exports.OwnerController = void 0;
const database_js_1 = __importDefault(require("../config/database.js"));
const apiResponse_js_1 = require("../utils/apiResponse.js");
const bcrypt_1 = __importDefault(require("bcrypt"));
const companyHelper_js_1 = require("../utils/companyHelper.js");
class OwnerController {
    async getAll(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const owners = await database_js_1.default.owner.findMany({
                where: companyId ? { companyId } : {},
                include: {
                    properties: true,
                },
            });
            return (0, apiResponse_js_1.sendSuccess)({ res, data: owners });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const { name, firstName, lastName, email, phone, payoutMethod, password, propertiesOwned } = req.body;
            const resolvedName = name || `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';
            const companyId = await (0, companyHelper_js_1.getManagerCompanyId)(req, req.body.companyId || req.user?.companyId);
            const owner = await database_js_1.default.owner.create({
                data: {
                    name: resolvedName,
                    email,
                    phone,
                    payoutMethod: payoutMethod || 'ACH/Direct Deposit',
                    companyId,
                },
            });
            if (Array.isArray(propertiesOwned) && propertiesOwned.length > 0) {
                await database_js_1.default.property.updateMany({
                    where: { id: { in: propertiesOwned } },
                    data: { ownerId: owner.id },
                });
            }
            if (password) {
                let role = await database_js_1.default.role.findUnique({
                    where: { name: 'Owner' },
                });
                if (!role) {
                    role = await database_js_1.default.role.findFirst();
                }
                if (role) {
                    const passwordHash = await bcrypt_1.default.hash(password, 12);
                    const [first = '', ...lastParts] = resolvedName.split(' ');
                    const last = lastParts.join(' ') || 'Owner';
                    await database_js_1.default.user.create({
                        data: {
                            email,
                            passwordHash,
                            firstName: first || 'Owner',
                            lastName: last,
                            phone: phone || null,
                            roleId: role.id,
                            companyId,
                        },
                    });
                }
            }
            return (0, apiResponse_js_1.sendSuccess)({ res, statusCode: 201, data: owner });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const { name, firstName, lastName, email, phone, payoutMethod, password, propertiesOwned } = req.body;
            const resolvedName = name || `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';
            const companyId = req.user?.companyId;
            const oldOwner = await database_js_1.default.owner.findUnique({
                where: { id },
            });
            const owner = await database_js_1.default.owner.update({
                where: companyId ? { id, companyId } : { id },
                data: {
                    name: resolvedName,
                    email,
                    phone,
                    payoutMethod,
                },
            });
            if (Array.isArray(propertiesOwned)) {
                if (propertiesOwned.length > 0) {
                    await database_js_1.default.property.updateMany({
                        where: { id: { in: propertiesOwned } },
                        data: { ownerId: owner.id },
                    });
                }
            }
            if (password && oldOwner) {
                const passwordHash = await bcrypt_1.default.hash(password, 12);
                const [first = '', ...lastParts] = resolvedName.split(' ');
                const last = lastParts.join(' ') || 'Owner';
                const existingUser = await database_js_1.default.user.findFirst({
                    where: { email: oldOwner.email },
                });
                if (existingUser) {
                    await database_js_1.default.user.update({
                        where: { id: existingUser.id },
                        data: {
                            email,
                            passwordHash,
                            firstName: first || 'Owner',
                            lastName: last,
                            phone,
                        },
                    });
                }
                else {
                    let role = await database_js_1.default.role.findUnique({
                        where: { name: 'Owner' },
                    });
                    if (!role) {
                        role = await database_js_1.default.role.findFirst();
                    }
                    if (role) {
                        await database_js_1.default.user.create({
                            data: {
                                email,
                                passwordHash,
                                firstName: first || 'Owner',
                                lastName: last,
                                phone: phone || null,
                                roleId: role.id,
                                companyId,
                            },
                        });
                    }
                }
            }
            return (0, apiResponse_js_1.sendSuccess)({ res, data: owner });
        }
        catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const companyId = req.user?.companyId;
            const ownerExists = await database_js_1.default.owner.findFirst({
                where: companyId ? { id, companyId } : { id },
            });
            if (!ownerExists) {
                return res.status(404).json({ success: false, error: 'Owner not found' });
            }
            await database_js_1.default.$transaction(async (tx) => {
                // 1. Delete associated owner distributions
                await tx.ownerDistribution.deleteMany({
                    where: { ownerId: id },
                });
                // 2. Delete associated owner documents
                await tx.ownerDocument.deleteMany({
                    where: { ownerId: id },
                });
                // 3. Delete associated properties
                const properties = await tx.property.findMany({
                    where: { ownerId: id },
                    select: { id: true },
                });
                for (const prop of properties) {
                    await tx.property.delete({
                        where: { id: prop.id },
                    });
                }
                // 4. Delete the owner record
                await tx.owner.delete({
                    where: { id },
                });
            });
            return (0, apiResponse_js_1.sendSuccess)({ res, message: 'Owner deleted successfully' });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.OwnerController = OwnerController;
exports.ownerController = new OwnerController();
