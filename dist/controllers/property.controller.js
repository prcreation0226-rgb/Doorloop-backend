"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.propertyController = exports.PropertyController = void 0;
const property_service_1 = require("../services/property.service");
const apiResponse_1 = require("../utils/apiResponse");
class PropertyController {
    async getAll(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const properties = await property_service_1.propertyService.getAllProperties(companyId, req.user);
            return (0, apiResponse_1.sendSuccess)({ res, data: properties });
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const companyId = req.user?.companyId;
            const property = await property_service_1.propertyService.getPropertyById(id, companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: property });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const file = req.file;
            const newProp = await property_service_1.propertyService.createProperty({ ...req.body, companyId }, file);
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: newProp });
        }
        catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const companyId = req.user?.companyId;
            await property_service_1.propertyService.deleteProperty(id, companyId);
            return (0, apiResponse_1.sendSuccess)({ res, message: 'Property deleted successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const companyId = req.user?.companyId;
            const file = req.file;
            const updated = await property_service_1.propertyService.updateProperty(id, req.body, file, companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PropertyController = PropertyController;
exports.propertyController = new PropertyController();
