import { ReportRepository } from '../repositories/report.repository';
import prisma from '../../config/database';
import { AppError } from '../../utils/appError';

export class ReportService {
  private reportRepository: ReportRepository;

  constructor() {
    this.reportRepository = new ReportRepository();
  }

  // Helper: Resolve Allowed Property IDs for a User
  async resolveAllowedProperties(user: any, companyId: string): Promise<string[]> {
    if (!user) {
      throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
    }

    const userRole = user.roleName || user.role;
    if (userRole === 'Admin' || userRole === 'Accountant' || userRole === 'SuperAdmin' || userRole === 'Property Manager') {
      const properties = await prisma.property.findMany({
        where: { companyId },
        select: { id: true },
      });
      return properties.map((p) => p.id);
    }

    // For managers or others, filter by explicit user assignments
    const assignments = await prisma.userAssignment.findMany({
      where: { userId: user.id },
      select: { propertyId: true },
    });

    const assignedIds = assignments
      .map((a) => a.propertyId)
      .filter((id): id is string => id !== null);

    return assignedIds;
  }

  // 1. Rent Roll
  async getRentRoll(user: any, query: any) {
    const companyId = user.companyId;
    const allowedProperties = await this.resolveAllowedProperties(user, companyId);
    if (allowedProperties.length === 0) return { data: [], pagination: { page: 1, limit: 50, totalRecords: 0, totalPages: 0 } };

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
  async getOccupancy(user: any, query: any) {
    const companyId = user.companyId;
    const allowedProperties = await this.resolveAllowedProperties(user, companyId);
    if (allowedProperties.length === 0) return { data: [], pagination: { page: 1, limit: 50, totalRecords: 0, totalPages: 0 } };

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
  async getDelinquency(user: any, query: any) {
    const companyId = user.companyId;
    const allowedProperties = await this.resolveAllowedProperties(user, companyId);
    if (allowedProperties.length === 0) return { data: [], pagination: { page: 1, limit: 50, totalRecords: 0, totalPages: 0 } };

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
  async getProfitLoss(user: any, query: any) {
    const companyId = user.companyId;
    const allowedProperties = await this.resolveAllowedProperties(user, companyId);
    if (allowedProperties.length === 0) return { data: { income: [], expenses: [], summary: { totalIncome: 0, totalExpenses: 0, netProfit: 0 } } };

    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const lines = await this.reportRepository.getProfitLossData({
      companyId,
      propertyIds: allowedProperties,
      propertyId: query.propertyId,
      startDate,
      endDate,
    });

    const incomeMap: Record<string, number> = {};
    const expensesMap: Record<string, number> = {};

    lines.forEach((l) => {
      const category = l.account.accountName;
      const type = l.account.type; // e.g. "Revenue" or "Expense"
      const amount = l.credit - l.debit; // Credits are positive for revenue

      if (type === 'Revenue') {
        incomeMap[category] = (incomeMap[category] || 0) + amount;
      } else if (type === 'Expense') {
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
  async getMaintenance(user: any, query: any) {
    const companyId = user.companyId;
    const allowedProperties = await this.resolveAllowedProperties(user, companyId);
    if (allowedProperties.length === 0) return { data: [], pagination: { page: 1, limit: 50, totalRecords: 0, totalPages: 0 } };

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

    const data = result.workOrders.map((w: any) => ({
      ticketId: w.id.substring(0, 8).toUpperCase(),
      propertyName: w.property?.name || 'N/A',
      unitNumber: 'Common Area', // Fallback as WorkOrder links directly to property
      issue: w.title,
      priority: w.priority,
      status: w.status,
      assignedPerson: w.vendor?.contactName || 'Unassigned',
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
  async getPaymentHistory(user: any, query: any) {
    const companyId = user.companyId;
    const allowedProperties = await this.resolveAllowedProperties(user, companyId);
    if (allowedProperties.length === 0) return { data: [], pagination: { page: 1, limit: 50, totalRecords: 0, totalPages: 0 } };

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
  async createExport(user: any, body: any) {
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

  async getExports(user: any, query: any) {
    const companyId = user.companyId;
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    return this.reportRepository.getExports(companyId, user.id, page, limit);
  }
}
export const reportService = new ReportService();
