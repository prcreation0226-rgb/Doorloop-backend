"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportService = exports.ReportService = void 0;
const report_repository_1 = require("../repositories/report.repository");
const database_1 = __importDefault(require("../../config/database"));
const appError_1 = require("../../utils/appError");
class ReportService {
    reportRepository;
    constructor() {
        this.reportRepository = new report_repository_1.ReportRepository();
    }
    // Helper: Resolve Allowed Property IDs for a User
    async resolveAllowedProperties(user, companyId) {
        if (!user) {
            throw new appError_1.AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
        }
        // Admins or Accountants get access to all properties in the company
        if (user.role === 'Admin' || user.role === 'Accountant' || user.role === 'SuperAdmin') {
            const properties = await database_1.default.property.findMany({
                where: { companyId },
                select: { id: true },
            });
            return properties.map((p) => p.id);
        }
        // For managers or others, filter by explicit user assignments
        const assignments = await database_1.default.userAssignment.findMany({
            where: { userId: user.id },
            select: { propertyId: true },
        });
        const assignedIds = assignments
            .map((a) => a.propertyId)
            .filter((id) => id !== null);
        return assignedIds;
    }
    // 1. Rent Roll
    async getRentRoll(user, query) {
        const companyId = user.companyId;
        const allowedProperties = await this.resolveAllowedProperties(user, companyId);
        if (allowedProperties.length === 0)
            return { data: [], pagination: { page: 1, limit: 50, totalRecords: 0, totalPages: 0 } };
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 50;
        const result = await this.reportRepository.getRentRollData({
            companyId,
            propertyIds: allowedProperties,
            propertyId: query.propertyId,
            leaseStatus: query.status,
            search: query.search,
            page,
            limit,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
        });
        const data = result.leases.map((l) => ({
            propertyName: l.property?.name || 'N/A',
            unitNumber: l.unit?.unitNumber || 'N/A',
            tenantName: l.tenant ? `${l.tenant.firstName} ${l.tenant.lastName}` : 'Vacant',
            startDate: l.startDate,
            endDate: l.endDate,
            leaseStatus: l.status,
            monthlyRent: l.rentAmount,
            securityDeposit: l.depositAmount,
            unitStatus: l.unit?.status || 'Vacant',
        }));
        return {
            data,
            pagination: {
                page,
                limit,
                totalRecords: result.totalRecords,
                totalPages: Math.ceil(result.totalRecords / limit),
            },
        };
    }
    // 2. Occupancy Report
    async getOccupancy(user, query) {
        const companyId = user.companyId;
        const allowedProperties = await this.resolveAllowedProperties(user, companyId);
        if (allowedProperties.length === 0)
            return { data: [], pagination: { page: 1, limit: 50, totalRecords: 0, totalPages: 0 } };
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 50;
        const result = await this.reportRepository.getOccupancyData({
            companyId,
            propertyIds: allowedProperties,
            propertyId: query.propertyId,
            page,
            limit,
        });
        const data = result.properties.map((p) => {
            const totalUnits = p.units.length;
            const occupiedUnits = p.units.filter((u) => u.status === 'Occupied').length;
            const vacantUnits = totalUnits - occupiedUnits;
            const occupancyPercentage = totalUnits > 0 ? parseFloat(((occupiedUnits / totalUnits) * 100).toFixed(2)) : 0.0;
            return {
                propertyName: p.name,
                totalUnits,
                occupiedUnits,
                vacantUnits,
                occupancyPercentage,
            };
        });
        return {
            data,
            pagination: {
                page,
                limit,
                totalRecords: result.totalRecords,
                totalPages: Math.ceil(result.totalRecords / limit),
            },
        };
    }
    // 3. Delinquency Report
    async getDelinquency(user, query) {
        const companyId = user.companyId;
        const allowedProperties = await this.resolveAllowedProperties(user, companyId);
        if (allowedProperties.length === 0)
            return { data: [], pagination: { page: 1, limit: 50, totalRecords: 0, totalPages: 0 } };
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 50;
        const result = await this.reportRepository.getDelinquencyData({
            companyId,
            propertyIds: allowedProperties,
            propertyId: query.propertyId,
            tenantId: query.tenantId,
            status: query.status,
            page,
            limit,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
        });
        const today = new Date().getTime();
        const data = result.invoices.map((inv) => {
            const dueDateMs = new Date(inv.dueDate).getTime();
            const diffTime = Math.max(0, today - dueDateMs);
            const daysLate = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            return {
                tenantName: inv.tenant ? `${inv.tenant.firstName} ${inv.tenant.lastName}` : 'N/A',
                propertyName: inv.propertyName || 'N/A',
                unitNumber: inv.unitNumber || 'N/A',
                dueDate: inv.dueDate,
                rentAmount: inv.amount,
                paidAmount: inv.paidAmount,
                outstandingBalance: inv.balance,
                daysLate,
                paymentStatus: inv.status,
            };
        });
        return {
            data,
            pagination: {
                page,
                limit,
                totalRecords: result.totalRecords,
                totalPages: Math.ceil(result.totalRecords / limit),
            },
        };
    }
    // 4. Profit & Loss Report
    async getProfitLoss(user, query) {
        const companyId = user.companyId;
        const allowedProperties = await this.resolveAllowedProperties(user, companyId);
        if (allowedProperties.length === 0)
            return { data: { income: [], expenses: [], summary: { totalIncome: 0, totalExpenses: 0, netProfit: 0 } } };
        const startDate = query.startDate ? new Date(query.startDate) : undefined;
        const endDate = query.endDate ? new Date(query.endDate) : undefined;
        const lines = await this.reportRepository.getProfitLossData({
            companyId,
            propertyIds: allowedProperties,
            propertyId: query.propertyId,
            startDate,
            endDate,
        });
        const incomeMap = {};
        const expensesMap = {};
        lines.forEach((l) => {
            const category = l.account.accountName;
            const type = l.account.type; // e.g. "Revenue" or "Expense"
            const amount = l.credit - l.debit; // Credits are positive for revenue
            if (type === 'Revenue') {
                incomeMap[category] = (incomeMap[category] || 0) + amount;
            }
            else if (type === 'Expense') {
                const expAmount = l.debit - l.credit; // Debits are positive for expenses
                expensesMap[category] = (expensesMap[category] || 0) + expAmount;
            }
        });
        const income = Object.keys(incomeMap).map((k) => ({ name: k, amount: incomeMap[k] }));
        const expenses = Object.keys(expensesMap).map((k) => ({ name: k, amount: expensesMap[k] }));
        const totalIncome = income.reduce((acc, curr) => acc + curr.amount, 0);
        const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
        const netProfit = totalIncome - totalExpenses;
        return {
            data: {
                income,
                expenses,
                summary: {
                    totalIncome,
                    totalExpenses,
                    netProfit,
                },
            },
        };
    }
    // 5. Maintenance Report
    async getMaintenance(user, query) {
        const companyId = user.companyId;
        const allowedProperties = await this.resolveAllowedProperties(user, companyId);
        if (allowedProperties.length === 0)
            return { data: [], pagination: { page: 1, limit: 50, totalRecords: 0, totalPages: 0 } };
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 50;
        const result = await this.reportRepository.getMaintenanceData({
            companyId,
            propertyIds: allowedProperties,
            propertyId: query.propertyId,
            status: query.status,
            priority: query.priority,
            page,
            limit,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
        });
        const data = result.workOrders.map((w) => ({
            ticketId: w.id.substring(0, 8).toUpperCase(),
            propertyName: w.property?.name || 'N/A',
            unitNumber: 'Common Area', // Fallback as WorkOrder links directly to property
            issue: w.title,
            priority: w.priority,
            status: w.status,
            assignedPerson: w.staff?.name || 'Unassigned',
            vendor: w.vendor?.companyName || 'Unassigned',
            estimatedCost: w.estimatedCost || 0,
            actualCost: w.actualCost || 0,
            createdDate: w.createdAt,
            completedDate: w.completedAt || null,
        }));
        return {
            data,
            pagination: {
                page,
                limit,
                totalRecords: result.totalRecords,
                totalPages: Math.ceil(result.totalRecords / limit),
            },
        };
    }
    // 6. Payment History
    async getPaymentHistory(user, query) {
        const companyId = user.companyId;
        const allowedProperties = await this.resolveAllowedProperties(user, companyId);
        if (allowedProperties.length === 0)
            return { data: [], pagination: { page: 1, limit: 50, totalRecords: 0, totalPages: 0 } };
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 50;
        const result = await this.reportRepository.getPaymentHistoryData({
            companyId,
            propertyIds: allowedProperties,
            propertyId: query.propertyId,
            tenantId: query.tenantId,
            paymentMethod: query.paymentMethod,
            status: query.status,
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined,
            page,
            limit,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
        });
        const data = result.payments.map((p) => ({
            tenantName: p.tenant ? `${p.tenant.firstName} ${p.tenant.lastName}` : 'N/A',
            propertyName: p.property?.name || 'N/A',
            unitNumber: p.unit?.unitNumber || 'N/A',
            paymentDate: p.paidDate || p.dueDate,
            amount: p.amount,
            paymentMethod: p.paymentMethod,
            referenceNumber: p.referenceNumber || 'N/A',
            paymentStatus: p.status,
        }));
        return {
            data,
            pagination: {
                page,
                limit,
                totalRecords: result.totalRecords,
                totalPages: Math.ceil(result.totalRecords / limit),
            },
        };
    }
    // Exports tracking
    async createExport(user, body) {
        const companyId = user.companyId;
        return this.reportRepository.createExport({
            companyId,
            userId: user.id,
            reportType: body.reportType,
            filters: JSON.stringify(body.filters),
            fileName: body.fileName,
            fileType: body.fileType,
            status: 'Pending',
        });
    }
    async getExports(user, query) {
        const companyId = user.companyId;
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 20;
        return this.reportRepository.getExports(companyId, user.id, page, limit);
    }
}
exports.ReportService = ReportService;
exports.reportService = new ReportService();
