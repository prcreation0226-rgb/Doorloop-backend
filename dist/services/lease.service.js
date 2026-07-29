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
        return database_1.default.$transaction(async (tx) => {
            const lease = await tx.lease.create({
                data: {
                    tenantId: data.tenantId,
                    propertyId: data.propertyId,
                    unitId: data.unitId,
                    startDate: new Date(data.startDate),
                    endDate: new Date(data.endDate),
                    rentAmount: Number(data.rentAmount),
                    depositAmount: Number(data.depositAmount),
                    status: 'Pending_Move_In',
                    companyId: data.companyId,
                },
            });
            await tx.moveIn.create({
                data: {
                    leaseId: lease.id,
                    unitId: lease.unitId,
                    scheduledDate: lease.startDate,
                    status: 'SCHEDULED',
                    createdBy: data.createdBy || 'System',
                    companyId: data.companyId,
                },
            });
            await tx.auditLog.create({
                data: {
                    action: 'Lease Created & Move In Scheduled',
                    userId: data.userId || null,
                    module: 'Leasing',
                    object: `Lease ${lease.id}`,
                    ip: '127.0.0.1',
                    status: 'Success',
                },
            });
            return lease;
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
