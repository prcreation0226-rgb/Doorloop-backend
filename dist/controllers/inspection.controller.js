"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inspectionController = exports.InspectionController = void 0;
const inspection_service_1 = require("../services/inspection.service");
const apiResponse_1 = require("../utils/apiResponse");
class InspectionController {
    async getById(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const inspection = await inspection_service_1.inspectionService.getInspectionById(req.params.id, companyId);
            if (!inspection)
                return res.status(404).json({ error: 'Inspection not found' });
            return (0, apiResponse_1.sendSuccess)({ res, data: inspection });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const inspection = await inspection_service_1.inspectionService.updateInspectionDraft(req.params.id, {
                ...req.body,
                userId: req.user?.userId,
            }, companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: inspection });
        }
        catch (error) {
            next(error);
        }
    }
    async complete(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const inspection = await inspection_service_1.inspectionService.completeInspection(req.params.id, req.user?.userId, companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: inspection });
        }
        catch (error) {
            next(error);
        }
    }
    async reopen(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const inspection = await inspection_service_1.inspectionService.reopenInspection(req.params.id, req.user?.userId, companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: inspection });
        }
        catch (error) {
            next(error);
        }
    }
    async getInspectors(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const inspectors = await inspection_service_1.inspectionService.getInspectors(companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: inspectors });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.InspectionController = InspectionController;
exports.inspectionController = new InspectionController();
