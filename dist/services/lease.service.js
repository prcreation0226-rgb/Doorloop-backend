"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaseService = exports.LeaseService = void 0;
const database_1 = __importDefault(require("../config/database"));
class LeaseService {
    async getAllLeases(companyId) {
        return database_1.default.lease.findMany({
            where: companyId ? { companyId } : {},
            include: {
                tenant: true,
                property: true,
                unit: true,
            },
        });
    }
    async createLease(data) {
        return database_1.default.lease.create({
            data: {
                tenantId: data.tenantId,
                propertyId: data.propertyId,
                unitId: data.unitId,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                rentAmount: data.rentAmount,
                depositAmount: data.depositAmount,
                status: data.status || 'Pending',
                companyId: data.companyId,
            },
        });
    }
    async updateLease(id, data, companyId) {
        if (companyId) {
            const lease = await database_1.default.lease.findFirst({
                where: { id, companyId },
            });
            if (!lease)
                throw new Error('Lease not found.');
        }
        return database_1.default.lease.update({
            where: { id },
            data: {
                status: data.status,
                endDate: data.endDate ? new Date(data.endDate) : undefined,
            },
        });
    }
    async deleteLease(id, companyId) {
        if (companyId) {
            const lease = await database_1.default.lease.findFirst({
                where: { id, companyId },
            });
            if (!lease)
                throw new Error('Lease not found.');
        }
        return database_1.default.lease.delete({
            where: { id },
        });
    }
}
exports.LeaseService = LeaseService;
exports.leaseService = new LeaseService();
