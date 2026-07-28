"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = exports.PaymentService = void 0;
const database_1 = __importDefault(require("../config/database"));
class PaymentService {
    async getAllPayments(companyId) {
        return database_1.default.rentPayment.findMany({
            where: companyId ? { companyId } : {},
            include: {
                tenant: true,
                property: true,
                unit: true,
                lease: true,
            },
        });
    }
    async processPayment(data) {
        let leaseId = data.leaseId;
        if (!leaseId && data.tenantId) {
            const lease = await database_1.default.lease.findFirst({
                where: { tenantId: data.tenantId },
                orderBy: { startDate: 'desc' },
            });
            if (lease) {
                leaseId = lease.id;
            }
            else if (data.unitId) {
                const unitLease = await database_1.default.lease.findFirst({
                    where: { unitId: data.unitId },
                    orderBy: { startDate: 'desc' },
                });
                if (unitLease) {
                    leaseId = unitLease.id;
                }
            }
        }
        // If still no lease, create a dummy one to satisfy Prisma constraint
        if (!leaseId && data.tenantId && data.propertyId && data.unitId) {
            const dummyLease = await database_1.default.lease.create({
                data: {
                    tenantId: data.tenantId,
                    propertyId: data.propertyId,
                    unitId: data.unitId,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    rentAmount: data.amount || 1000,
                    depositAmount: 1000,
                    status: 'Active',
                    companyId: data.companyId,
                },
            });
            leaseId = dummyLease.id;
        }
        if (!leaseId) {
            throw new Error('Cannot process payment: Tenant must have an active lease or unit assignment.');
        }
        return database_1.default.rentPayment.create({
            data: {
                tenantId: data.tenantId,
                propertyId: data.propertyId,
                unitId: data.unitId,
                leaseId: leaseId,
                amount: Number(data.amount),
                dueDate: new Date(data.dueDate || Date.now()),
                paidDate: new Date(data.paidDate || Date.now()),
                status: 'Paid',
                paymentMethod: data.paymentMethod || 'ACH',
                referenceNumber: data.referenceNumber || `REF-${Date.now()}`,
                companyId: data.companyId,
            },
        });
    }
}
exports.PaymentService = PaymentService;
exports.paymentService = new PaymentService();
