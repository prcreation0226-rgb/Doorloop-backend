import prisma from '../../config/database';

export class ReportRepository {
  // 1. Rent Roll Report Data
  async getRentRollData(params: {
    companyId: string;
    propertyIds: string[];
    propertyId?: string;
    leaseStatus?: string;
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { companyId, propertyIds, propertyId, leaseStatus, search, page, limit, sortBy, sortOrder = 'desc' } = params;
    const activePropertyIds = propertyId ? [propertyId] : propertyIds;

    if (!companyId || activePropertyIds.length === 0) {
      return { leases: [], totalRecords: 0 };
    }

    const whereClause: any = {
      companyId,
      propertyId: { in: activePropertyIds },
    };

    if (leaseStatus) {
      whereClause.status = leaseStatus;
    }

    if (search) {
      whereClause.AND = [
        {
          OR: [
            { tenant: { firstName: { contains: search } } },
            { tenant: { lastName: { contains: search } } },
            { property: { name: { contains: search } } },
            { unit: { unitNumber: { contains: search } } },
          ],
        },
      ];
    }

    const skip = (page - 1) * limit;

    // Build orderBy
    let orderBy: any = { startDate: sortOrder };
    if (sortBy === 'endDate') orderBy = { endDate: sortOrder };
    if (sortBy === 'rentAmount') orderBy = { rentAmount: sortOrder };
    if (sortBy === 'depositAmount') orderBy = { depositAmount: sortOrder };

    const [leases, totalRecords] = await Promise.all([
      prisma.lease.findMany({
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
      prisma.lease.count({ where: whereClause }),
    ]);

    return { leases, totalRecords };
  }

  // 2. Occupancy Report Data
  async getOccupancyData(params: {
    companyId: string;
    propertyIds: string[];
    propertyId?: string;
    page: number;
    limit: number;
  }) {
    const { companyId, propertyIds, propertyId, page, limit } = params;
    const activePropertyIds = propertyId ? [propertyId] : propertyIds;

    if (!companyId || activePropertyIds.length === 0) {
      return { properties: [], totalRecords: 0 };
    }

    const whereClause: any = {
      companyId,
      id: { in: activePropertyIds },
    };

    const skip = (page - 1) * limit;

    const [properties, totalRecords] = await Promise.all([
      prisma.property.findMany({
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
      prisma.property.count({ where: whereClause }),
    ]);

    return { properties, totalRecords };
  }

  // 3. Delinquency Report Data
  async getDelinquencyData(params: {
    companyId: string;
    propertyIds: string[];
    propertyId?: string;
    tenantId?: string;
    status?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { companyId, propertyIds, propertyId, tenantId, status, page, limit, sortBy, sortOrder = 'desc' } = params;
    const activePropertyIds = propertyId ? [propertyId] : propertyIds;

    if (!companyId || activePropertyIds.length === 0) {
      return { invoices: [], totalRecords: 0 };
    }

    const whereClause: any = {
      companyId,
      propertyId: { in: activePropertyIds },
    };

    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    if (status) {
      whereClause.status = status;
    }

    const skip = (page - 1) * limit;

    let orderBy: any = { dueDate: sortOrder };
    if (sortBy === 'balance') orderBy = { balance: sortOrder };
    if (sortBy === 'amount') orderBy = { amount: sortOrder };

    const [invoices, totalRecords] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause,
        include: {
          tenant: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where: whereClause }),
    ]);

    return { invoices, totalRecords };
  }

  // 4. Profit & Loss Report Data
  async getProfitLossData(params: {
    companyId: string;
    propertyIds: string[];
    propertyId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { companyId, propertyIds, propertyId, startDate, endDate } = params;
    const activePropertyIds = propertyId ? [propertyId] : propertyIds;

    if (!companyId || activePropertyIds.length === 0) {
      return [];
    }

    const whereClause: any = {
      journalEntry: {
        companyId,
      },
      propertyId: { in: activePropertyIds },
    };

    if (startDate || endDate) {
      whereClause.journalEntry.date = {};
      if (startDate) whereClause.journalEntry.date.gte = startDate;
      if (endDate) whereClause.journalEntry.date.lte = endDate;
    }

    // Retrieve general ledger lines aggregated by account
    const lines = await prisma.journalEntryLine.findMany({
      where: whereClause,
      include: {
        account: true,
        journalEntry: true,
      },
    });

    return lines;
  }

  // 5. Maintenance Report Data
  async getMaintenanceData(params: {
    companyId: string;
    propertyIds: string[];
    propertyId?: string;
    status?: string;
    priority?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { companyId, propertyIds, propertyId, status, priority, page, limit, sortBy, sortOrder = 'desc' } = params;
    const activePropertyIds = propertyId ? [propertyId] : propertyIds;

    if (!companyId || activePropertyIds.length === 0) {
      return { workOrders: [], totalRecords: 0 };
    }

    const whereClause: any = {
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

    let orderBy: any = { createdAt: sortOrder };
    if (sortBy === 'estimatedCost') orderBy = { estimatedCost: sortOrder };
    if (sortBy === 'actualCost') orderBy = { actualCost: sortOrder };

    const [workOrders, totalRecords] = await Promise.all([
      prisma.workOrder.findMany({
        where: whereClause,
        include: {
          property: true,
          vendor: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.workOrder.count({ where: whereClause }),
    ]);

    return { workOrders, totalRecords };
  }

  // 6. Payment History Report Data
  async getPaymentHistoryData(params: {
    companyId: string;
    propertyIds: string[];
    propertyId?: string;
    tenantId?: string;
    paymentMethod?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      companyId,
      propertyIds,
      propertyId,
      tenantId,
      paymentMethod,
      status,
      startDate,
      endDate,
      page,
      limit,
      sortBy,
      sortOrder = 'desc',
    } = params;

    const activePropertyIds = propertyId ? [propertyId] : propertyIds;

    if (!companyId || activePropertyIds.length === 0) {
      return { payments: [], totalRecords: 0 };
    }

    const whereClause: any = {
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
      if (startDate) whereClause.paidDate.gte = startDate;
      if (endDate) whereClause.paidDate.lte = endDate;
    }

    const skip = (page - 1) * limit;

    let orderBy: any = { paidDate: sortOrder };
    if (sortBy === 'amount') orderBy = { amount: sortOrder };

    const [payments, totalRecords] = await Promise.all([
      prisma.rentPayment.findMany({
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
      prisma.rentPayment.count({ where: whereClause }),
    ]);

    return { payments, totalRecords };
  }

  // Exports Tracking
  private static inMemoryExports: any[] = [];

  async createExport(data: any) {
    try {
      if ((prisma as any).reportExport) {
        return await (prisma as any).reportExport.create({ data });
      }
    } catch (e) {
      console.warn('DB reportExport create failed, using in-memory store:', e);
    }
    const newEntry = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    ReportRepository.inMemoryExports.unshift(newEntry);
    return newEntry;
  }

  async saveExport(data: any) {
    return this.createExport(data);
  }

  async getExports(companyId: string, userId: string, page: number, limit: number) {
    try {
      if ((prisma as any).reportExport) {
        const skip = (page - 1) * limit;
        const [exports, totalRecords] = await Promise.all([
          (prisma as any).reportExport.findMany({
            where: companyId ? { OR: [{ companyId }, { companyId: null }] } : {},
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          (prisma as any).reportExport.count({
            where: companyId ? { OR: [{ companyId }, { companyId: null }] } : {},
          }),
        ]);
        if (exports && exports.length > 0) {
          return { exports, totalRecords };
        }
      }
    } catch (e) {
      console.warn('DB reportExport findMany failed, returning in-memory store:', e);
    }

    const filtered = ReportRepository.inMemoryExports.filter(
      (item) => !companyId || !item.companyId || item.companyId === companyId
    );
    const skip = (page - 1) * limit;
    const paginated = filtered.slice(skip, skip + limit);
    return { exports: paginated, totalRecords: filtered.length };
  }

  async updateExportStatus(
    id: string,
    status: 'Pending' | 'Processing' | 'Completed' | 'Failed',
    fileUrl?: string,
    errorMessage?: string
  ) {
    try {
      if ((prisma as any).reportExport) {
        return await (prisma as any).reportExport.update({
          where: { id },
          data: {
            status,
            fileUrl,
            errorMessage,
          },
        });
      }
    } catch (e) {
      console.warn('DB reportExport update failed, updating in-memory store:', e);
    }

    const item = ReportRepository.inMemoryExports.find((x) => x.id === id);
    if (item) {
      item.status = status;
      if (fileUrl) item.fileUrl = fileUrl;
      if (errorMessage) item.errorMessage = errorMessage;
      item.updatedAt = new Date();
    }
    return item;
  }
}
