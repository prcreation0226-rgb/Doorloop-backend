"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moveOutController = exports.MoveOutController = void 0;
const moveOut_service_1 = require("../services/moveOut.service");
const apiResponse_1 = require("../utils/apiResponse");
class MoveOutController {
    async getAll(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const status = req.query.status;
            const moveOuts = await moveOut_service_1.moveOutService.getAllMoveOuts(companyId, status);
            return (0, apiResponse_1.sendSuccess)({ res, data: moveOuts });
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const moveOut = await moveOut_service_1.moveOutService.getMoveOutById(req.params.id, companyId);
            if (!moveOut)
                return res.status(404).json({ error: 'Move Out record not found' });
            return (0, apiResponse_1.sendSuccess)({ res, data: moveOut });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const moveOut = await moveOut_service_1.moveOutService.createMoveOut({
                ...req.body,
                companyId,
                createdBy: req.user?.email || 'System',
            });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: moveOut });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const moveOut = await moveOut_service_1.moveOutService.updateMoveOut(req.params.id, {
                ...req.body,
                userId: req.user?.userId,
            }, companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: moveOut });
        }
        catch (error) {
            next(error);
        }
    }
    async startInspection(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const inspection = await moveOut_service_1.moveOutService.startInspection(req.params.id, req.body.templateId, req.user?.userId || 'System', companyId);
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: inspection });
        }
        catch (error) {
            next(error);
        }
    }
    async reviewDamage(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const moveOut = await moveOut_service_1.moveOutService.submitDamageReview(req.params.id, req.body.items, req.user?.userId || 'System', companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: moveOut });
        }
        catch (error) {
            next(error);
        }
    }
    async saveDepositSummary(req, res, next) {
        try {
            const summary = await moveOut_service_1.moveOutService.saveDepositSummary(req.params.id, req.body);
            return (0, apiResponse_1.sendSuccess)({ res, data: summary });
        }
        catch (error) {
            next(error);
        }
    }
    async completeMoveOut(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const moveOut = await moveOut_service_1.moveOutService.completeMoveOut(req.params.id, req.user?.userId, companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: moveOut });
        }
        catch (error) {
            next(error);
        }
    }
    async cancelMoveOut(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const moveOut = await moveOut_service_1.moveOutService.cancelMoveOut(req.params.id, req.body.reason, req.user?.userId, companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: moveOut });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.MoveOutController = MoveOutController;
exports.moveOutController = new MoveOutController();
