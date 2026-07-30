"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportRepository = void 0;
const database_1 = __importDefault(require("../../config/database"));
class ReportRepository {
    // 1. Rent Roll Report Data
    async getRentRollData(params) {
        const { companyId, propertyIds, propertyId, leaseStatus, search, page, limit, sortBy, sortOrder = 'desc' } = params;
        // Filter by allowed properties
        const activePropertyIds = propertyId ? [propertyId] : propertyIds;
        const whereClause = {
            companyId,
            propertyId: { in: activePropertyIds },
        };
        if (leaseStatus) {
            whereClause.status = leaseStatus;
        }
        if (search) {
            whereClause.OR = [
                { tenant: { firstName: { contains: search } } },
                { tenant: { lastName: { contains: search } } },
                { property: { name: { contains: search } } },
                { unit: { unitNumber: { contains: search } } },
            ];
        }
        const skip = (page - 1) * limit;
        // Build orderBy
        let orderBy = { startDate: sortOrder };
        if (sortBy === 'endDate')
            orderBy = { endDate: sortOrder };
        if (sortBy === 'rentAmount')
            orderBy = { rentAmount: sortOrder };
        if (sortBy === 'depositAmount')
            orderBy = { depositAmount: sortOrder };
        const [leases, totalRecords] = await Promise.all([
            database_1.default.lease.findMany({
                where: whereClause,
                include: {
                    property: true,
                    unit: true,
                    tenant: true,
                },
                orderBy,
                skip,
                take: limit,
            }),
            database_1.default.lease.count({ where: whereClause }),
        ]);
        return { leases, totalRecords };
    }
    // 2. Occupancy Report Data
    async getOccupancyData(params) {
        const { companyId, propertyIds, propertyId, page, limit } = params;
        const activePropertyIds = propertyId ? [propertyId] : propertyIds;
        const whereClause = {
            companyId,
            id: { in: activePropertyIds },
        };
        const skip = (page - 1) * limit;
        const [properties, totalRecords] = await Promise.all([
            database_1.default.property.findMany({
                where: whereClause,
                include: {
                    units: {
                        select: {
                            status: true,
                        },
                    },
                },
                skip,
                take: limit,
            }),
            database_1.default.property.count({ where: whereClause }),
        ]);
        return { properties, totalRecords };
    }
    // 3. Delinquency Report Data
    async getDelinquencyData(params) {
        const { companyId, propertyIds, propertyId, tenantId, status, page, limit, sortBy, sortOrder = 'desc' } = params;
        const activePropertyIds = propertyId ? [propertyId] : propertyIds;
        // We fetch unpaid or partially paid invoices that are past due
        const whereClause = {
            companyId,
            propertyId: { in: activePropertyIds },
            balance: { gt: 0 },
            dueDate: { lt: new Date() },
        };
        if (tenantId) {
            whereClause.tenantId = tenantId;
        }
        if (status) {
            whereClause.status = status;
        }
        const skip = (page - 1) * limit;
        let orderBy = { dueDate: sortOrder };
        if (sortBy === 'balance')
            orderBy = { balance: sortOrder };
        if (sortBy === 'amount')
            orderBy = { amount: sortOrder };
        const [invoices, totalRecords] = await Promise.all([
            database_1.default.invoice.findMany({
                where: whereClause,
                include: {
                    tenant: true,
                },
                orderBy,
                skip,
                take: limit,
            }),
            database_1.default.invoice.count({ where: whereClause }),
        ]);
        return { invoices, totalRecords };
    }
    // 4. Profit & Loss Report Data
    async getProfitLossData(params) {
        const { companyId, propertyIds, propertyId, startDate, endDate } = params;
        const activePropertyIds = propertyId ? [propertyId] : propertyIds;
        const whereClause = {
            journalEntry: {
                companyId,
            },
        };
        if (activePropertyIds.length > 0) {
            whereClause.propertyId = { in: activePropertyIds };
        }
        if (startDate || endDate) {
            whereClause.journalEntry.date = {};
            if (startDate)
                whereClause.journalEntry.date.gte = startDate;
            if (endDate)
                whereClause.journalEntry.date.lte = endDate;
        }
        // Retrieve general ledger lines aggregated by account
        const lines = await database_1.default.journalEntryLine.findMany({
            where: whereClause,
            include: {
                account: true,
                journalEntry: true,
            },
        });
        return lines;
    }
    // 5. Maintenance Report Data
    async getMaintenanceData(params) {
        const { companyId, propertyIds, propertyId, status, priority, page, limit, sortBy, sortOrder = 'desc' } = params;
        const activePropertyIds = propertyId ? [propertyId] : propertyIds;
        const whereClause = {
            companyId,
            propertyId: { in: activePropertyIds },
        };
        if (status) {
            whereClause.status = status;
        }
        if (priority) {
            whereClause.priority = priority;
        }
        const skip = (page - 1) * limit;
        let orderBy = { createdAt: sortOrder };
        if (sortBy === 'estimatedCost')
            orderBy = { estimatedCost: sortOrder };
        if (sortBy === 'actualCost')
            orderBy = { actualCost: sortOrder };
        const [workOrders, totalRecords] = await Promise.all([
            database_1.default.workOrder.findMany({
                where: whereClause,
                include: {
                    property: true,
                    vendor: true,
                },
                orderBy,
                skip,
                take: limit,
            }),
            database_1.default.workOrder.count({ where: whereClause }),
        ]);
        return { workOrders, totalRecords };
    }
    // 6. Payment History Report Data
    async getPaymentHistoryData(params) {
        const { companyId, propertyIds, propertyId, tenantId, paymentMethod, status, startDate, endDate, page, limit, sortBy, sortOrder = 'desc', } = params;
        const activePropertyIds = propertyId ? [propertyId] : propertyIds;
        const whereClause = {
            companyId,
            propertyId: { in: activePropertyIds },
        };
        if (tenantId) {
            whereClause.tenantId = tenantId;
        }
        if (paymentMethod) {
            whereClause.paymentMethod = paymentMethod;
        }
        if (status) {
            whereClause.status = status;
        }
        if (startDate || endDate) {
            whereClause.paidDate = {};
            if (startDate)
                whereClause.paidDate.gte = startDate;
            if (endDate)
                whereClause.paidDate.lte = endDate;
        }
        const skip = (page - 1) * limit;
        let orderBy = { paidDate: sortOrder };
        if (sortBy === 'amount')
            orderBy = { amount: sortOrder };
        const [payments, totalRecords] = await Promise.all([
            database_1.default.rentPayment.findMany({
                where: whereClause,
                include: {
                    tenant: true,
                    property: true,
                    unit: true,
                },
                orderBy,
                skip,
                take: limit,
            }),
            database_1.default.rentPayment.count({ where: whereClause }),
        ]);
        return { payments, totalRecords };
    }
    // Exports Tracking
    async createExport(data) {
        return database_1.default.reportExport.create({ data });
    }
    async saveExport(data) {
        return database_1.default.reportExport.create({ data });
    }
    async getExports(companyId, userId, page, limit) {
        const skip = (page - 1) * limit;
        const [exports, totalRecords] = await Promise.all([
            database_1.default.reportExport.findMany({
                where: { companyId, userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            database_1.default.reportExport.count({ where: { companyId, userId } }),
        ]);
        return { exports, totalRecords };
    }
    async updateExportStatus(id, status, fileUrl, errorMessage) {
        return database_1.default.reportExport.update({
            where: { id },
            data: {
                status,
                fileUrl,
                errorMessage,
                completedAt: status === 'Completed' || status === 'Failed' ? new Date() : undefined,
            },
        });
    }
}
exports.ReportRepository = ReportRepository;
