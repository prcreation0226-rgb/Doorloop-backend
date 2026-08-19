import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { getManagerCompanyId } from '../utils/companyHelper';
import { authorizeNetService } from './authorizeNet.service';

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

  async createCompany(data: {
    name: string;
    code?: string;
    contactName: string;
    email: string;
    phone: string;
    planName?: string;
    price?: number;
    password?: string;
    cardNumber?: string;
    cardExpiry?: string;
    cardCvv?: string;
    cardName?: string;
    transactionId?: string;
  }) {
    let code = data.code || data.name.substring(0, 4).toUpperCase().trim();
    if (!code || code.length < 2) {
      code = 'COMP';
    }
    const baseCode = code;
    let counter = 1;
    while (true) {
      const existing = await prisma.company.findUnique({ where: { code } });
      if (!existing) {
        break;
      }
      code = `${baseCode.substring(0, 3)}${counter}`;
      counter++;
    }

    const planName = data.planName || 'Starter Plan';
    let planPrice = Number(data.price) || 99;
    if (planName.toLowerCase().includes('enterprise')) {
      planPrice = 499;
    } else if (planName.toLowerCase().includes('pro')) {
      planPrice = 199;
    }

    // 1. Process & Verify Subscription Payment via Authorize.Net Gateway
    let gatewayTxId = data.transactionId || '';
    if (!gatewayTxId) {
      throw new Error('Payment Transaction ID is required for registration.');
    }

    const verifyResult = await authorizeNetService.verifyTransaction(gatewayTxId);
    if (!verifyResult.success) {
      throw new Error(`Payment verification failed: ${verifyResult.message}`);
    }

    planPrice = verifyResult.amount || planPrice;

    // 2. Create Company with Active status
    let company = await prisma.company.findFirst({ where: { email: data.email } });
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: data.name,
          code,
          contactName: data.contactName,
          email: data.email,
          phone: data.phone,
          planName: planName,
          storageUsed: '1.2 GB',
          status: 'Active',
        },
      });
    } else {
      company = await prisma.company.update({
        where: { id: company.id },
        data: { status: 'Active', planName: planName },
      });
    }

    // 3. Log Superadmin Invoice / Revenue Record
    try {
      await this.createInvoice({
        companyId: company.id,
        companyName: company.name,
        amount: planPrice,
        status: 'Paid',
        dueDate: new Date(),
        paidDate: new Date(),
        transactionId: gatewayTxId,
      });
    } catch (invErr) {
      console.warn('Could not log superadmin subscription invoice:', invErr);
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

    // Create or update matching CompanyUser record for platform-users page list
    const existingCompanyUser = await prisma.companyUser.findUnique({ where: { email: data.email } });
    if (existingCompanyUser) {
      await prisma.companyUser.update({
        where: { id: existingCompanyUser.id },
        data: {
          companyId: company.id,
          name: data.contactName,
          role: 'Property Manager',
          status: 'Active',
        },
      });
    } else {
      await prisma.companyUser.create({
        data: {
          companyId: company.id,
          name: data.contactName,
          email: data.email,
          role: 'Property Manager',
          status: 'Active',
        },
      });
    }

    return company;

  }

  async updateCompany(id: string, data: any) {
    const updated = await prisma.company.update({
      where: { id },
      data,
    });

    if (data.status) {
      const companyStatus = data.status; // "Active" or "Suspended"
      const tenantStatus = companyStatus === 'Active' ? 'Active' : 'Inactive';

      await prisma.$transaction([
        prisma.user.updateMany({
          where: { companyId: id },
          data: { status: companyStatus }
        }),
        prisma.companyUser.updateMany({
          where: { companyId: id },
          data: { status: companyStatus }
        }),
        prisma.property.updateMany({
          where: { companyId: id },
          data: { status: companyStatus }
        }),
        prisma.tenant.updateMany({
          where: { companyId: id },
          data: { status: tenantStatus }
        })
      ]);
    }

    return updated;
  }

  async deleteCompany(id: string) {
    // 1. Fetch related IDs for nested/indirect deletions
    const tenants = await prisma.tenant.findMany({
      where: { companyId: id },
      select: { id: true }
    });
    const tenantIds = tenants.map(t => t.id);

    const owners = await prisma.owner.findMany({
      where: { companyId: id },
      select: { id: true }
    });
    const ownerIds = owners.map(o => o.id);

    // 2. Perform deletions in transactional sequence to resolve foreign keys
    return prisma.$transaction(async (tx) => {
      // a. Webhooks & Integrations logs
      await tx.companyIntegration.deleteMany({ where: { companyId: id } });
      await tx.saaSInvoice.deleteMany({ where: { companyId: id } });
      
      // b. Invoices & Payments
      await tx.rentPayment.deleteMany({ where: { companyId: id } });
      await tx.invoice.deleteMany({ where: { companyId: id } });

      // c. Leases & Renewals (cascade deletes MoveIn, MoveOut, Renewals)
      await tx.lease.deleteMany({ where: { companyId: id } });

      // d. Inspections & Templates (cascade deletes rooms, items, photos)
      await tx.inspection.deleteMany({ where: { companyId: id } });
      await tx.inspectionTemplate.deleteMany({ where: { companyId: id } });

      // e. Violations & Work Orders
      await tx.violation.deleteMany({ where: { companyId: id } });
      await tx.workOrder.deleteMany({ where: { companyId: id } });
      await tx.serviceRequest.deleteMany({ where: { companyId: id } });

      // f. Property, Units, Buildings (cascade deletes units, buildings)
      await tx.property.deleteMany({ where: { companyId: id } });

      // g. Tenants sub-tables
      await tx.charge.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.deposit.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.paymentPlan.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.insurancePolicy.deleteMany({ where: { companyId: id } });
      await tx.screeningReport.deleteMany({ where: { companyId: id } });
      await tx.tenant.deleteMany({ where: { companyId: id } });

      // h. Owners sub-tables
      await tx.ownerDistribution.deleteMany({ where: { ownerId: { in: ownerIds } } });
      await tx.ownerDocument.deleteMany({ where: { companyId: id } });
      await tx.owner.deleteMany({ where: { companyId: id } });

      // i. Accounts & Ledger (cascade deletes lines)
      await tx.journalEntry.deleteMany({ where: { companyId: id } });
      await tx.coAAccount.deleteMany({ where: { companyId: id } });
      await tx.bankAccount.deleteMany({ where: { companyId: id } });

      // j. Documents & Comms
      await tx.document.deleteMany({ where: { companyId: id } });
      await tx.tenantDocument.deleteMany({ where: { companyId: id } });
      await tx.announcement.deleteMany({ where: { companyId: id } });
      await tx.notification.deleteMany({ where: { companyId: id } });
      await tx.aiChatLog.deleteMany({ where: { companyId: id } });
      await tx.promotion.deleteMany({ where: { companyId: id } });

      // k. Users, Staff, Vendors
      await tx.staffProfile.deleteMany({ where: { companyId: id } });
      await tx.vendor.deleteMany({ where: { companyId: id } });
      await tx.companyUser.deleteMany({ where: { companyId: id } });

      // Nullify userId reference on audit logs before deleting users
      const companyUsers = await tx.user.findMany({ where: { companyId: id }, select: { id: true } });
      const userIds = companyUsers.map(u => u.id);
      await tx.auditLog.updateMany({
        where: { userId: { in: userIds } },
        data: { userId: null }
      });
      await tx.user.deleteMany({ where: { companyId: id } });

      // l. Finally, delete the company record itself
      return tx.company.delete({
        where: { id },
      });
    });
  }


  async getCompanyUsers(companyId?: string) {
    const whereClause: any = {};
    if (companyId) {
      whereClause.companyId = companyId;
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
    return prisma.companyUser.update({
      where: { id },
      data: { status },
    });
  }

  async deleteCompanyUser(id: string) {
    const companyUser = await prisma.companyUser.findUnique({
      where: { id },
    });
    return prisma.$transaction(async (tx) => {
      if (companyUser && companyUser.email) {
        await tx.user.deleteMany({
          where: { email: companyUser.email },
        });
      }
      return tx.companyUser.delete({
        where: { id },
      });
    });
  }

  // SaaS Subscription Plans
  async getPlans() {
    let plans = await prisma.saaSPlan.findMany({
      orderBy: { price: 'asc' },
    });
    if (plans.length === 0) {
      await prisma.saaSPlan.createMany({
        data: [
          {
            name: 'Starter',
            price: 99,
            billingCycle: 'Monthly',
            maxProperties: 50,
            maxUnits: 100,
            features: 'Up to 50 properties, Basic screening logs, Standard ledger billing',
          },
          {
            name: 'Professional',
            price: 199,
            billingCycle: 'Monthly',
            maxProperties: 200,
            maxUnits: 500,
            features: 'Up to 200 properties, Late Fee rules builder, AI tenant conversation logs',
          },
          {
            name: 'Enterprise',
            price: 499,
            billingCycle: 'Monthly',
            maxProperties: 9999,
            maxUnits: 99999,
            features: 'Unlimited properties, Developer webhook callbacks, API keys rotation, Dedicated vector library',
          },
        ],
      });
      plans = await prisma.saaSPlan.findMany({ orderBy: { price: 'asc' } });
    }
    return plans;
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

  async createInvoice(data: { companyId?: string; companyName: string; amount: number; status?: string; dueDate?: string | Date; paidDate?: string | Date; transactionId?: string }) {
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
        transactionId: data.transactionId || null,
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
