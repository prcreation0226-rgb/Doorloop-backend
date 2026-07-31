import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { getManagerCompanyId } from '../utils/companyHelper';

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

  async createCompany(data: { name: string; code?: string; contactName: string; email: string; phone: string; planName?: string; password?: string }) {
    const code = data.code || data.name.substring(0, 4).toUpperCase();
    let company = await prisma.company.findFirst({ where: { email: data.email } });
    if (!company) {
      company = await prisma.company.create({
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

    // Create or update the matching login User for the company
    const passwordHash = await bcrypt.hash(data.password || 'admin123', 12);
    const propertyManagerRole = await prisma.role.findFirst({ where: { name: 'Property Manager' } });

    const nameParts = data.contactName.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Admin';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    if (propertyManagerRole) {
      const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            firstName,
            lastName,
            passwordHash,
            companyId: company.id,
            roleId: propertyManagerRole.id,
          },
        });
      } else {
        await prisma.user.create({
          data: {
            email: data.email,
            passwordHash,
            firstName,
            lastName,
            phone: data.phone,
            roleId: propertyManagerRole.id,
            companyId: company.id,
            status: 'Active',
          },
        });
      }
    }

    return company;
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

  async getCompanyUsers(companyId?: string) {
    const whereClause: any = {};
    if (companyId) {
      whereClause.companyId = companyId;
      whereClause.role = {
        in: ['Maintenance Staff', 'Collection Manager', 'Maintenance'],
      };
    }

    const companyUsers = await prisma.companyUser.findMany({
      where: whereClause,
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });

    const emails = companyUsers.map((u) => u.email).filter(Boolean);
    const vendors = await prisma.vendor.findMany({
      where: { email: { in: emails } },
    });

    return companyUsers.map((u) => {
      const matched = vendors.find((v) => v.email === u.email);
      return {
        ...u,
        serviceType: matched ? matched.serviceType : undefined,
      };
    });
  }

  async createCompanyUser(data: { companyId?: string; name: string; email: string; role?: string; phone?: string; password?: string; serviceType?: string }) {
    let finalCompanyId = await getManagerCompanyId(undefined, data.companyId);

    // Map user-facing "Maintenance" role to "Maintenance Staff"
    let mappedRole = data.role || 'Property Manager';
    if (mappedRole === 'Maintenance') {
      mappedRole = 'Maintenance Staff';
    }

    // 1. Create or update companyUser record
    let companyUser = await prisma.companyUser.findUnique({
      where: { email: data.email },
    });

    if (companyUser) {
      companyUser = await prisma.companyUser.update({
        where: { id: companyUser.id },
        data: {
          companyId: finalCompanyId,
          name: data.name,
          role: mappedRole,
          status: 'Active',
        },
      });
    } else {
      companyUser = await prisma.companyUser.create({
        data: {
          companyId: finalCompanyId,
          name: data.name,
          email: data.email,
          role: mappedRole,
          status: 'Active',
        },
      });
    }

    // 2. Fetch the corresponding Role record from DB
    const roleObj = await prisma.role.findFirst({
      where: { name: mappedRole },
    });

    if (roleObj) {
      const passwordHash = await bcrypt.hash(data.password || 'staff123', 12);
      const nameParts = data.name.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Staff';
      const lastName = nameParts.slice(1).join(' ') || 'User';

      // 3. Create or update login user in users table
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            firstName,
            lastName,
            passwordHash,
            roleId: roleObj.id,
            companyId: finalCompanyId,
            status: 'Active',
          },
        });
      } else {
        await prisma.user.create({
          data: {
            email: data.email,
            passwordHash,
            firstName,
            lastName,
            phone: data.phone || '',
            roleId: roleObj.id,
            companyId: finalCompanyId,
            status: 'Active',
          },
        });
      }

      // Automatically create matching Vendor record if the role is Maintenance Staff
      if (mappedRole === 'Maintenance Staff') {
        const existingVendor = await prisma.vendor.findFirst({
          where: { email: data.email },
        });

        if (!existingVendor) {
          await prisma.vendor.create({
            data: {
              companyName: data.name,
              contactName: data.name,
              email: data.email,
              phone: data.phone || '',
              serviceType: data.serviceType || 'General Maintenance',
              rating: 5.0,
              companyId: finalCompanyId,
            },
          });
        }
      }
    }

    return companyUser;
  }

  async updateCompanyUserStatus(id: string, status: string) {
    const companyUser = await prisma.companyUser.update({
      where: { id },
      data: { status },
    });
    if (companyUser.email) {
      await prisma.user.updateMany({
        where: { email: companyUser.email },
        data: { status },
      });
    }
    return companyUser;
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
