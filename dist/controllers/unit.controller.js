"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitController = exports.UnitController = void 0;
const database_1 = __importDefault(require("../config/database"));
const apiResponse_1 = require("../utils/apiResponse");
const appError_1 = require("../utils/appError");
class UnitController {
    async getAll(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const units = await database_1.default.unit.findMany({
                where: companyId ? {
                    property: {
                        companyId: companyId
                    }
                } : {},
                include: {
                    property: true,
                    building: true,
                    tenants: true,
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: units });
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const id = req.params.id;
            const companyId = req.user?.companyId;
            const unit = await database_1.default.unit.findFirst({
                where: companyId ? {
                    id,
                    property: { companyId },
                } : { id },
                include: {
                    property: true,
                    building: true,
                    tenants: true,
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: unit });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const { propertyId, buildingId, unitNumber, floor, bedrooms, bathrooms, squareFootage, rentAmount, securityDeposit, availabilityDate, status, } = req.body;
            const companyId = req.user?.companyId;
            let targetPropertyId = propertyId;
            let property = targetPropertyId ? await database_1.default.property.findUnique({ where: { id: targetPropertyId } }) : null;
            if (!property) {
                property = await database_1.default.property.findFirst({
                    where: companyId ? { companyId } : {},
                });
            }
            if (!property) {
                throw new Error('Please create a property before adding units.');
            }
            targetPropertyId = property.id;
            let finalBuildingId = buildingId;
            if (finalBuildingId) {
                const existingBuilding = await database_1.default.building.findUnique({
                    where: { id: finalBuildingId },
                });
                if (!existingBuilding) {
                    finalBuildingId = undefined;
                }
                else if (existingBuilding.unitsCount > 0) {
                    const currentUnitsCount = await database_1.default.unit.count({
                        where: { buildingId: finalBuildingId },
                    });
                    if (currentUnitsCount >= existingBuilding.unitsCount) {
                        throw new appError_1.AppError(`Cannot add unit. This building is restricted to a maximum of ${existingBuilding.unitsCount} units.`, 400, 'BUILDING_CAPACITY_REACHED');
                    }
                }
            }
            if (!finalBuildingId) {
                let building = await database_1.default.building.findFirst({
                    where: { propertyId: targetPropertyId },
                });
                if (!building) {
                    building = await database_1.default.building.create({
                        data: {
                            propertyId: targetPropertyId,
                            name: 'Main Building',
                            floors: 1,
                            unitsCount: 1,
                        },
                    });
                }
                finalBuildingId = building.id;
                if (building.unitsCount > 0) {
                    const currentUnitsCount = await database_1.default.unit.count({
                        where: { buildingId: finalBuildingId },
                    });
                    if (currentUnitsCount >= building.unitsCount) {
                        throw new appError_1.AppError(`Cannot add unit. The building has reached its maximum capacity of ${building.unitsCount} units.`, 400, 'BUILDING_CAPACITY_REACHED');
                    }
                }
            }
            const unit = await database_1.default.unit.create({
                data: {
                    propertyId: targetPropertyId,
                    buildingId: finalBuildingId,
                    unitNumber,
                    floor: parseInt(floor || '1'),
                    bedrooms: parseInt(bedrooms || '1'),
                    bathrooms: parseFloat(bathrooms || '1.0'),
                    squareFootage: parseFloat(squareFootage || '0'),
                    rentAmount: parseFloat(rentAmount || '0'),
                    securityDeposit: parseFloat(securityDeposit || '0'),
                    availabilityDate: new Date(availabilityDate || Date.now()),
                    status: status || 'Vacant',
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: unit });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const id = req.params.id;
            const companyId = req.user?.companyId;
            const { propertyId, buildingId, unitNumber, floor, bedrooms, bathrooms, squareFootage, rentAmount, securityDeposit, availabilityDate, status, } = req.body;
            if (companyId) {
                const check = await database_1.default.unit.findFirst({
                    where: {
                        id,
                        property: { companyId },
                    },
                });
                if (!check)
                    throw new Error('Unit not found.');
            }
            const unit = await database_1.default.unit.update({
                where: { id },
                data: {
                    propertyId,
                    buildingId,
                    unitNumber,
                    floor: floor !== undefined ? parseInt(floor) : undefined,
                    bedrooms: bedrooms !== undefined ? parseInt(bedrooms) : undefined,
                    bathrooms: bathrooms !== undefined ? parseFloat(bathrooms) : undefined,
                    squareFootage: squareFootage !== undefined ? parseFloat(squareFootage) : undefined,
                    rentAmount: rentAmount !== undefined ? parseFloat(rentAmount) : undefined,
                    securityDeposit: securityDeposit !== undefined ? parseFloat(securityDeposit) : undefined,
                    availabilityDate: availabilityDate ? new Date(availabilityDate) : undefined,
                    status,
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: unit });
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
                const check = await database_1.default.unit.findFirst({
                    where: {
                        id,
                        property: { companyId },
                    },
                });
                if (!check)
                    throw new Error('Unit not found.');
            }
            await database_1.default.unit.delete({
                where: { id },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: { success: true } });
        }
        catch (error) {
            next(error);
        }
    }
    async assignTenant(req, res, next) {
        try {
            const id = req.params.id;
            const companyId = req.user?.companyId;
            const { tenantId } = req.body;
            if (companyId) {
                const check = await database_1.default.unit.findFirst({
                    where: {
                        id,
                        property: { companyId },
                    },
                });
                if (!check)
                    throw new Error('Unit not found.');
            }
            const unit = await database_1.default.unit.update({
                where: { id },
                data: {
                    status: 'Occupied',
                    tenants: {
                        connect: { id: tenantId },
                    },
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: unit });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.UnitController = UnitController;
exports.unitController = new UnitController();
