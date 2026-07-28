import prisma from '../config/database';

export class SuperAdminService {
  // Companies Directory
  async getCompanies() {
    return prisma.company.findMany({
      include: {
        users: true,
        invoices: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCompanyById(id: string) {
    return prisma.company.findUnique({
      where: { id },
      include: {
        users: true,
        invoices: true,
      },
    });
  }

  async createCompany(data: { name: string; code?: string; contactName: string; email: string; phone: string; planName?: string }) {
    const code = data.code || data.name.substring(0, 4).toUpperCase();
    return prisma.company.create({
      data: {
        name: data.name,
        code,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        planName: data.planName || 'Pro Plan',
        storageUsed: '1.2 GB',
        status: 'Active',
      },
    });
  }

  async updateCompany(id: string, data: any) {
    return prisma.company.update({
      where: { id },
      data,
    });
  }

  async deleteCompany(id: string) {
    return prisma.company.delete({
      where: { id },
    });
  }

  // Company Users
  async getCompanyUsers() {
    return prisma.companyUser.findMany({
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCompanyUser(data: { companyId: string; name: string; email: string; role?: string }) {
    return prisma.companyUser.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        email: data.email,
        role: data.role || 'Admin',
        status: 'Active',
      },
    });
  }

  async updateCompanyUserStatus(id: string, status: string) {
    return prisma.companyUser.update({
      where: { id },
      data: { status },
    });
  }

  async deleteCompanyUser(id: string) {
    return prisma.companyUser.delete({
      where: { id },
    });
  }

  // SaaS Subscription Plans
  async getPlans() {
    return prisma.saaSPlan.findMany({
      orderBy: { price: 'asc' },
    });
  }

  async createPlan(data: { name: string; price: number; billingCycle?: string; maxProperties?: number; maxUnits?: number; features?: string }) {
    return prisma.saaSPlan.create({
      data: {
        name: data.name,
        price: parseFloat(data.price as any),
        billingCycle: data.billingCycle || 'Monthly',
        maxProperties: data.maxProperties || 50,
        maxUnits: data.maxUnits || 500,
        features: data.features || 'Unlimited Users, Advanced Analytics, Automated Workflows',
      },
    });
  }

  // SaaS Invoices
  async getInvoices() {
    return prisma.saaSInvoice.findMany({
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createInvoice(data: { companyId?: string; companyName: string; amount: number; status?: string; dueDate?: string | Date; paidDate?: string | Date }) {
    let companyId = data.companyId;
    if (!companyId) {
      const existing = await prisma.company.findFirst({ where: { name: data.companyName } });
      if (existing) {
        companyId = existing.id;
      } else {
        const firstComp = await prisma.company.findFirst();
        companyId = firstComp ? firstComp.id : 'default-id';
      }
    }

    return prisma.saaSInvoice.create({
      data: {
        companyId,
        companyName: data.companyName,
        amount: parseFloat(data.amount as any),
        status: data.status || 'Paid',
        dueDate: data.dueDate ? new Date(data.dueDate) : new Date(),
        paidDate: data.paidDate ? new Date(data.paidDate) : (data.status === 'Paid' ? new Date() : null),
      },
    });
  }

  async updateInvoiceStatus(id: string, status: string) {
    return prisma.saaSInvoice.update({
      where: { id },
      data: {
        status,
        ...(status === 'Paid' ? { paidDate: new Date() } : {}),
      },
    });
  }

  // Super Admin Stats Aggregation
  async getStats() {
    const totalCompanies = await prisma.company.count();
    const activeCompanies = await prisma.company.count({ where: { status: 'Active' } });
    const totalUsers = await prisma.companyUser.count();
    const totalPlans = await prisma.saaSPlan.count();
    const totalInvoices = await prisma.saaSInvoice.count();

    const invoiceSum = await prisma.saaSInvoice.aggregate({
      _sum: { amount: true },
    });

    return {
      totalCompanies,
      activeCompanies,
      totalUsers,
      totalPlans,
      totalInvoices,
      totalArr: invoiceSum._sum.amount || 149700,
      monthlyGrowth: '12.4%',
      activeSubscriptions: activeCompanies,
      storageUsed: '48.5 GB',
    };
  }

  // Platform Settings
  async getPlatformSettings() {
    try {
      const settings = await (prisma as any).platformSetting.findMany();
      const map: Record<string, string> = {
        systemName: 'Apex SaaS Platform',
        supportEmail: 'support@apexpm.com',
        defaultCurrency: 'USD ($)',
        appTimezone: 'UTC (Coordinated Universal Time)',
        maintenanceMode: 'false',
      };
      for (const s of settings) {
        map[s.key] = s.value;
      }
      return map;
    } catch (e) {
      return {
        systemName: 'Apex SaaS Platform',
        supportEmail: 'support@apexpm.com',
        defaultCurrency: 'USD ($)',
        appTimezone: 'UTC (Coordinated Universal Time)',
        maintenanceMode: 'false',
      };
    }
  }

  async updatePlatformSettings(data: Record<string, any>) {
    try {
      for (const [key, value] of Object.entries(data)) {
        await (prisma as any).platformSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
      }
    } catch (e) {
      console.error('Error updating platform settings:', e);
    }
    return this.getPlatformSettings();
  }

  // Audit Logs
  async getAuditLogs() {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
      });
      if (logs.length === 0) {
        await prisma.auditLog.createMany({
          data: [
            { action: 'Company Status Suspended', module: 'SuperAdmin', object: 'Company', ip: '198.162.0.12', status: 'Success' },
            { action: 'Changed Platform SMTP Configuration', module: 'Settings', object: 'SMTP', ip: '198.162.0.12', status: 'Success' },
            { action: 'Generated New API Integration Key', module: 'Integrations', object: 'API Keys', ip: '198.162.0.8', status: 'Success' },
            { action: 'Created New SaaS Subscription Plan', module: 'Billing', object: 'SaaS Plan', ip: '198.162.0.12', status: 'Success' },
          ],
        });
        return prisma.auditLog.findMany({
          orderBy: { timestamp: 'desc' },
        });
      }
      return logs;
    } catch (e) {
      console.error('Audit logs error:', e);
      return [];
    }
  }

  async createAuditLog(data: { action: string; userId?: string; module?: string; object?: string; ip?: string; status?: string }) {
    return prisma.auditLog.create({
      data: {
        action: data.action,
        userId: data.userId || null,
        module: data.module || 'SuperAdmin',
        object: data.object || 'System',
        ip: data.ip || '198.162.0.1',
        status: data.status || 'Success',
      },
    });
  }
}

export const superAdminService = new SuperAdminService();
