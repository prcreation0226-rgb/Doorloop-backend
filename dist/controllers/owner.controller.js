"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ownerController = exports.OwnerController = void 0;
const database_js_1 = __importDefault(require("../config/database.js"));
const apiResponse_js_1 = require("../utils/apiResponse.js");
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
            const { name, firstName, lastName, email, phone, payoutMethod } = req.body;
            const resolvedName = name || `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';
            const companyId = req.user?.companyId;
            const owner = await database_js_1.default.owner.create({
                data: {
                    name: resolvedName,
                    email,
                    phone,
                    payoutMethod: payoutMethod || 'ACH/Direct Deposit',
                    companyId,
                },
            });
            return (0, apiResponse_js_1.sendSuccess)({ res, statusCode: 201, data: owner });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const { name, firstName, lastName, email, phone, payoutMethod } = req.body;
            const resolvedName = name || `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';
            const companyId = req.user?.companyId;
            const owner = await database_js_1.default.owner.update({
                where: companyId ? { id, companyId } : { id },
                data: {
                    name: resolvedName,
                    email,
                    phone,
                    payoutMethod,
                },
            });
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
            await database_js_1.default.owner.delete({
                where: companyId ? { id, companyId } : { id },
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
