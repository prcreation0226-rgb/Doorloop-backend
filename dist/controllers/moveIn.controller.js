"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moveInController = exports.MoveInController = void 0;
const moveIn_service_1 = require("../services/moveIn.service");
const inspection_service_1 = require("../services/inspection.service");
const apiResponse_1 = require("../utils/apiResponse");
class MoveInController {
    async getAll(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const status = req.query.status;
            const moveIns = await moveIn_service_1.moveInService.getAllMoveIns(companyId, status);
            return (0, apiResponse_1.sendSuccess)({ res, data: moveIns });
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const moveIn = await moveIn_service_1.moveInService.getMoveInById(req.params.id, companyId);
            if (!moveIn)
                return res.status(404).json({ error: 'Move In record not found' });
            return (0, apiResponse_1.sendSuccess)({ res, data: moveIn });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const moveIn = await moveIn_service_1.moveInService.createMoveIn({
                ...req.body,
                companyId,
                createdBy: req.user?.email || 'System',
            });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: moveIn });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const moveIn = await moveIn_service_1.moveInService.updateMoveIn(req.params.id, {
                ...req.body,
                userId: req.user?.userId,
            }, companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: moveIn });
        }
        catch (error) {
            next(error);
        }
    }
    async startInspection(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const inspection = await inspection_service_1.inspectionService.startInspection({
                moveInId: req.params.id,
                templateId: req.body.templateId,
                createdBy: req.user?.email || 'System',
                userId: req.user?.userId,
                companyId,
            });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: inspection });
        }
        catch (error) {
            next(error);
        }
    }
    async completeMoveIn(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const moveIn = await moveIn_service_1.moveInService.completeMoveIn(req.params.id, req.user?.userId, companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: moveIn });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.MoveInController = MoveInController;
exports.moveInController = new MoveInController();
