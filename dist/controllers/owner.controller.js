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
            const { firstName, lastName, email, phone, payoutMethod } = req.body;
            const companyId = req.user?.companyId;
            const owner = await database_js_1.default.owner.create({
                data: {
                    firstName,
                    lastName,
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
}
exports.OwnerController = OwnerController;
exports.ownerController = new OwnerController();
