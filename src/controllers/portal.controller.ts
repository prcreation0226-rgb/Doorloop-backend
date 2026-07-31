import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class PortalController {
  // --- Helper to get tenant for logged in user ---
  private async getTenantForUser(req: AuthenticatedRequest) {
    const userEmail = req.user?.email;
    if (!userEmail) return null;

    return prisma.tenant.findFirst({
      where: { email: userEmail },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        leases: {
          include: {
            property: true,
            unit: true,
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });
  }

  // --- Tenant Portal Views ---
  async getTenantLeases(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await this.getTenantForUser(req);
      if (!tenant) {
        return sendSuccess({ res, data: [] });
      }

      const leases = await prisma.lease.findMany({
        where: { tenantId: tenant.id },
        include: {
          property: true,
          unit: true,
          tenant: true,
        },
      });
      return sendSuccess({ res, data: leases });
    } catch (error) {
      next(error);
    }
  }

  async getTenantLease(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await this.getTenantForUser(req);
      if (!tenant || !tenant.leases || tenant.leases.length === 0) {
        return sendSuccess({ res, data: null });
      }

      const lease = tenant.leases[0];

      return sendSuccess({
        res,
        data: {
          id: lease.id,
          propertyName: lease.property?.name || 'Property',
          unitNumber: lease.unit ? `Unit ${lease.unit.unitNumber}` : 'Unassigned Unit',
          rentAmount: lease.rentAmount || 0,
          securityDeposit: lease.depositAmount || 0,
          leaseStart: lease.startDate ? new Date(lease.startDate).toISOString().split('T')[0] : '',
          leaseEnd: lease.endDate ? new Date(lease.endDate).toISOString().split('T')[0] : '',
          status: lease.status || 'Active',
          tenantName: `${tenant.firstName} ${tenant.lastName}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getTenantMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await this.getTenantForUser(req);
      if (!tenant) {
        return sendSuccess({
          res,
          data: {
            currentRent: 0,
            nextDueDate: 'N/A',
            outstandingBalance: 0,
            activeVisitors: 0,
            packagesWaiting: 0,
            leaseExpiration: 'N/A',
          },
        });
      }

      const activeLease = tenant.leases && tenant.leases.length > 0 ? tenant.leases[0] : null;
      const rent = activeLease?.rentAmount || 0;

      const unpaidInvoices = await prisma.invoice.findMany({
        where: { tenantId: tenant.id, status: { in: ['Sent', 'Overdue', 'Partially Paid'] } },
      });
      const balance = unpaidInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);

      return sendSuccess({
        res,
        data: {
          currentRent: rent,
          nextDueDate: activeLease?.endDate ? new Date(activeLease.endDate).toISOString().split('T')[0] : 'N/A',
          outstandingBalance: balance,
          activeVisitors: 0,
          packagesWaiting: 0,
          leaseExpiration: activeLease?.endDate ? new Date(activeLease.endDate).toISOString().split('T')[0] : 'N/A',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getTenantProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await this.getTenantForUser(req);
      if (!tenant) {
        return sendSuccess({
          res,
          data: {
            id: 'none',
            firstName: 'Tenant',
            lastName: 'User',
            email: req.user?.email || '',
            phone: '',
            unitNumber: 'N/A',
            emergencyContact: 'N/A',
          },
        });
      }

      return sendSuccess({
        res,
        data: {
          id: tenant.id,
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          email: tenant.email,
          phone: tenant.phone,
          unitNumber: tenant.unit ? `Unit ${tenant.unit.unitNumber}` : 'Unassigned',
          emergencyContact: 'Emergency Contact Available',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTenantProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { firstName, lastName, email, phone } = req.body;
      const userEmail = req.user?.email;
      if (!userEmail) throw new Error('Unauthorized');

      let tenant = await prisma.tenant.findFirst({
        where: { email: userEmail },
        include: { unit: true },
      });

      if (!tenant) {
        throw new Error('Tenant profile not found for logged in email.');
      }

      tenant = await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          firstName: firstName || tenant.firstName,
          lastName: lastName || tenant.lastName,
          email: email || tenant.email,
          phone: phone || tenant.phone,
        },
        include: { unit: true },
      });

      return sendSuccess({
        res,
        data: {
          id: tenant.id,
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          email: tenant.email,
          phone: tenant.phone,
          unitNumber: tenant.unit ? `Unit ${tenant.unit.unitNumber}` : 'Unassigned',
          emergencyContact: 'Emergency Contact Available',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getTenantMaintenance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await this.getTenantForUser(req);
      if (!tenant) {
        return sendSuccess({ res, data: [] });
      }

      const requests = await prisma.serviceRequest.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = requests.map((sr: any) => ({
        id: sr.id,
        title: sr.title,
        propertyName: sr.propertyName || 'Property',
        unitName: tenant.unit ? `Unit ${tenant.unit.unitNumber}` : 'Unit',
        priority: sr.priority || 'Medium',
        status: sr.status || 'Submitted',
        date: sr.createdAt ? new Date(sr.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        description: sr.description || '',
        preferredTime: 'Morning (8AM - 12PM)',
      }));

      return sendSuccess({ res, data: formatted });
    } catch (error) {
      next(error);
    }
  }

  async createTenantMaintenance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await this.getTenantForUser(req);
      const { title, priority, description, preferredTime } = req.body;
      
      const propertyId = tenant?.unit?.propertyId || (await prisma.property.findFirst())?.id;
      if (!propertyId) throw new Error('No property available for maintenance request.');

      const propertyRec = await prisma.property.findUnique({ where: { id: propertyId } });
      const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Tenant';

      const newRequest = await prisma.serviceRequest.create({
        data: {
          title: title || 'General Repair Request',
          description: description || '',
          priority: priority || 'Normal',
          status: 'New',
          category: 'General',
          propertyId: propertyId,
          propertyName: propertyRec?.name || 'Property',
          unitNumber: tenant?.unit ? tenant.unit.unitNumber : '',
          tenantId: tenant?.id || null,
          tenantName: tenantName,
          companyId: tenant?.companyId || null,
          messages: '[]',
        },
      });

      return sendSuccess({
        res,
        statusCode: 201,
        data: {
          id: newRequest.id,
          title: newRequest.title,
          propertyName: newRequest.propertyName,
          unitName: tenant?.unit ? `Unit ${tenant.unit.unitNumber}` : 'Unit',
          priority: newRequest.priority,
          status: newRequest.status,
          date: new Date(newRequest.createdAt).toISOString().split('T')[0],
          description: newRequest.description,
          preferredTime: preferredTime || 'Morning (8AM - 12PM)',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getTenantDocuments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await this.getTenantForUser(req);
      if (!tenant) {
        return sendSuccess({ res, data: [] });
      }

      const docs = await prisma.tenantDocument.findMany({
        where: { tenantId: tenant.id },
        orderBy: { uploadedAt: 'desc' },
      });

      const formatted = docs.map((d: any) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        uploadedAt: d.uploadedAt ? new Date(d.uploadedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        size: d.size || '1.5 MB',
      }));

      return sendSuccess({ res, data: formatted });
    } catch (error) {
      next(error);
    }
  }

  async uploadTenantDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await this.getTenantForUser(req);
      const { name, category, size } = req.body;
      const newDoc = await prisma.tenantDocument.create({
        data: {
          name: name || 'Tenant_Document.pdf',
          category: category || 'Rental Agreement',
          size: size || '1.5 MB',
          tenantId: tenant?.id || undefined,
        },
      });

      return sendSuccess({
        res,
        statusCode: 201,
        data: {
          id: newDoc.id,
          name: newDoc.name,
          category: newDoc.category,
          uploadedAt: new Date(newDoc.uploadedAt).toISOString().split('T')[0],
          size: newDoc.size,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Helper to get properties assigned to the logged-in owner ---
  private async getPropertiesForOwner(req: AuthenticatedRequest) {
    const userEmail = req.user?.email;
    if (!userEmail) return [];

    const owner = await prisma.owner.findFirst({
      where: { email: userEmail },
    });

    if (!owner) return [];

    return prisma.property.findMany({
      where: { ownerId: owner.id },
      include: { units: true, buildings: true },
    });
  }

  // --- Owner Portal Views ---
  async getOwnerFinancials(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const properties = await this.getPropertiesForOwner(req);
      const propertyIds = properties.map((p) => p.id);

      if (propertyIds.length === 0) {
        return sendSuccess({ res, data: [] });
      }

      const payments = await prisma.rentPayment.findMany({
        where: { propertyId: { in: propertyIds } },
        include: { property: true, tenant: true },
        orderBy: { paidDate: 'desc' },
      });

      const formatted = payments.map((p: any) => ({
        id: p.id,
        date: p.paidDate ? new Date(p.paidDate).toISOString().split('T')[0] : (p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        propertyName: p.property?.name || 'Property',
        tenantName: p.tenant ? `${p.tenant.firstName} ${p.tenant.lastName}` : 'Resident',
        category: 'Rental Income',
        amount: p.amount,
        status: p.status || 'Cleared',
      }));

      return sendSuccess({ res, data: formatted });
    } catch (error) {
      next(error);
    }
  }

  async getOwnerDistributions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userEmail = req.user?.email;
      const companyId = req.user?.companyId;

      let owner: any = null;
      if (userEmail) {
        owner = await prisma.owner.findFirst({ where: { email: userEmail } });
      }

      const whereFilter: any = {};
      if (owner) {
        whereFilter.ownerId = owner.id;
      } else if (companyId) {
        whereFilter.companyId = companyId;
      }

      const distributions = await prisma.ownerDistribution.findMany({
        where: Object.keys(whereFilter).length > 0 ? whereFilter : (companyId ? { companyId } : {}),
        orderBy: { processedDate: 'desc' },
      });

      const formatted = distributions.map((d: any, idx: number) => ({
        id: d.id,
        distributionNumber: `DIST-${1000 + idx}`,
        propertyName: d.period || 'Assigned Property Asset',
        date: d.processedDate ? new Date(d.processedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        amount: d.amount,
        method: 'Direct Deposit',
        status: d.status || 'Paid',
      }));

      return sendSuccess({ res, data: formatted });
    } catch (error) {
      next(error);
    }
  }

  async getOwnerStatements(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const properties = await this.getPropertiesForOwner(req);
      const propertyIds = properties.map((p) => p.id);

      if (propertyIds.length === 0) {
        return sendSuccess({ res, data: [] });
      }

      const payments = await prisma.rentPayment.findMany({
        where: { propertyId: { in: propertyIds } },
      });

      const statements = properties.map((p: any) => {
        const propPayments = payments.filter((pay) => pay.propertyId === p.id);
        const income = propPayments.reduce((sum, pay) => sum + pay.amount, 0);
        const expenses = Math.round(income * 0.1);
        return {
          id: `stmt-${p.id}`,
          period: 'Current Period',
          propertyName: p.name,
          openingBalance: 0,
          totalIncome: income,
          totalExpenses: expenses,
          netDistribution: income - expenses,
          endingBalance: 0,
          status: 'Published',
          generatedDate: new Date().toISOString().split('T')[0],
        };
      });

      return sendSuccess({ res, data: statements });
    } catch (error) {
      next(error);
    }
  }

  async getOwnerMaintenance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const properties = await this.getPropertiesForOwner(req);
      const propertyIds = properties.map((p) => p.id);

      if (propertyIds.length === 0) {
        return sendSuccess({ res, data: [] });
      }

      const workOrders = await prisma.workOrder.findMany({
        where: { propertyId: { in: propertyIds } },
        include: { property: true },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = workOrders.map((wo: any) => ({
        id: wo.id,
        title: wo.title,
        propertyName: wo.property?.name || 'Property',
        unitName: 'Unit',
        priority: wo.priority || 'Normal',
        status: wo.status || 'Open',
        date: wo.createdAt ? new Date(wo.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        description: wo.description || '',
        estimatedCost: wo.estimatedCost || 0,
      }));

      return sendSuccess({ res, data: formatted });
    } catch (error) {
      next(error);
    }
  }

  async getOwnerDocuments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userEmail = req.user?.email;
      if (!userEmail) return sendSuccess({ res, data: [] });

      const owner = await prisma.owner.findFirst({ where: { email: userEmail } });
      if (!owner) return sendSuccess({ res, data: [] });

      const docs = await prisma.ownerDocument.findMany({
        where: { ownerId: owner.id },
        orderBy: { uploadedAt: 'desc' },
      });

      const formatted = docs.map((d: any) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        uploadedAt: d.uploadedAt ? new Date(d.uploadedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        size: d.size || '1.5 MB',
      }));

      return sendSuccess({ res, data: formatted });
    } catch (error) {
      next(error);
    }
  }

  async uploadOwnerDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userEmail = req.user?.email;
      const owner = userEmail ? await prisma.owner.findFirst({ where: { email: userEmail } }) : null;
      const { name, category, size } = req.body;

      const newDoc = await prisma.ownerDocument.create({
        data: {
          name: name || 'Document.pdf',
          category: category || 'Statements',
          size: size || '1.5 MB',
          ownerId: owner?.id || undefined,
        },
      });

      return sendSuccess({
        res,
        statusCode: 201,
        data: {
          id: newDoc.id,
          name: newDoc.name,
          category: newDoc.category,
          uploadedAt: new Date(newDoc.uploadedAt).toISOString().split('T')[0],
          size: newDoc.size,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getOwnerMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userEmail = req.user?.email;
      if (!userEmail) return sendSuccess({ res, data: [] });

      const owner = await prisma.owner.findFirst({ where: { email: userEmail } });
      if (!owner) return sendSuccess({ res, data: [] });

      const msgs = await prisma.ownerMessage.findMany({
        where: {
          OR: [
            { recipient: { contains: owner.name } },
            { sender: { contains: owner.name } }
          ]
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = msgs.map((m: any) => ({
        id: m.id,
        sender: m.sender,
        recipient: m.recipient,
        subject: m.subject,
        body: m.body,
        timestamp: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
      }));

      return sendSuccess({ res, data: formatted });
    } catch (error) {
      next(error);
    }
  }

  async composeOwnerMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userEmail = req.user?.email;
      const owner = userEmail ? await prisma.owner.findFirst({ where: { email: userEmail } }) : null;

      const { sender, recipient, subject, body } = req.body;
      const newMsg = await prisma.ownerMessage.create({
        data: {
          sender: sender || (owner ? `${owner.name} (Owner)` : 'Owner User'),
          recipient: recipient || 'Property Manager',
          subject: subject || 'General Inquiry',
          body: body || '',
        },
      });

      return sendSuccess({
        res,
        statusCode: 201,
        data: {
          id: newMsg.id,
          sender: newMsg.sender,
          recipient: newMsg.recipient,
          subject: newMsg.subject,
          body: newMsg.body,
          timestamp: new Date(newMsg.createdAt).toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getOwnerProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userEmail = req.user?.email;
      let owner = userEmail ? await prisma.owner.findFirst({ where: { email: userEmail } }) : null;

      if (!owner) {
        return sendSuccess({
          res,
          data: {
            id: 'owner-none',
            firstName: 'Owner',
            lastName: 'User',
            email: userEmail || '',
            phone: '',
            streetAddress: '',
            bankName: 'N/A',
            accountNumber: 'N/A',
            payoutStatus: 'Pending',
          },
        });
      }

      const [firstName = '', ...lastNameParts] = (owner.name || '').split(' ');
      const lastName = lastNameParts.join(' ');

      return sendSuccess({
        res,
        data: {
          id: owner.id,
          firstName: firstName || 'Owner',
          lastName: lastName || 'User',
          email: owner.email,
          phone: owner.phone || '',
          streetAddress: owner.streetAddress || '',
          bankName: 'Checking Account',
          accountNumber: 'XXXX-XXXX-9822',
          payoutStatus: 'Verified',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateOwnerProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userEmail = req.user?.email;
      const { firstName, lastName, email, phone, streetAddress, bankName, accountNumber } = req.body;
      const inputName = [firstName, lastName].filter(Boolean).join(' ');

      let owner = userEmail ? await prisma.owner.findFirst({ where: { email: userEmail } }) : null;

      if (!owner) {
        throw new Error('Owner profile not found for logged in user email.');
      }

      owner = await prisma.owner.update({
        where: { id: owner.id },
        data: {
          name: inputName || owner.name,
          email: email || owner.email,
          phone: phone || owner.phone,
          streetAddress: streetAddress || owner.streetAddress,
        },
      });

      const [resFirstName = '', ...resLastNameParts] = (owner.name || '').split(' ');
      const resLastName = resLastNameParts.join(' ');

      return sendSuccess({
        res,
        data: {
          id: owner.id,
          firstName: resFirstName || 'Owner',
          lastName: resLastName || 'User',
          email: owner.email,
          phone: owner.phone,
          streetAddress: owner.streetAddress,
          bankName: bankName || 'Checking Account',
          accountNumber: accountNumber || 'XXXX-XXXX-9822',
          payoutStatus: 'Verified',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getOwnerReports(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const properties = await this.getPropertiesForOwner(req);
      const propertyIds = properties.map((p) => p.id);

      if (propertyIds.length === 0) {
        return sendSuccess({
          res,
          data: { revenue: 0, expenses: 0, occupancy: 0, distribution: 0 },
        });
      }

      const payments = await prisma.rentPayment.findMany({
        where: { propertyId: { in: propertyIds } },
      });

      const revenue = payments.reduce((sum, p) => sum + p.amount, 0);
      const expenses = Math.round(revenue * 0.1);
      const distribution = revenue - expenses;

      return sendSuccess({
        res,
        data: {
          revenue,
          expenses,
          occupancy: 95.0,
          distribution,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getOwnerMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const properties = await this.getPropertiesForOwner(req);
      const propertyIds = properties.map((p) => p.id);

      if (propertyIds.length === 0) {
        return sendSuccess({
          res,
          data: {
            monthlyIncome: 0,
            monthlyExpenses: 0,
            netDistribution: 0,
            netIncome: 0,
            totalProperties: 0,
            occupancyRate: 0,
            totalUnits: 0,
            activeLeases: 0,
            pendingMaintenance: 0,
          },
        });
      }

      const payments = await prisma.rentPayment.findMany({
        where: { propertyId: { in: propertyIds } },
      });

      const monthlyIncome = payments.reduce((sum, p) => sum + p.amount, 0);
      const monthlyExpenses = Math.round(monthlyIncome * 0.1);
      const netDistribution = monthlyIncome - monthlyExpenses;

      const totalProperties = properties.length;
      const totalUnits = properties.reduce((sum, p) => sum + (p.unitsCount || p.units?.length || 1), 0);

      return sendSuccess({
        res,
        data: {
          monthlyIncome,
          monthlyExpenses,
          netDistribution,
          netIncome: netDistribution,
          totalProperties,
          occupancyRate: 95.0,
          totalUnits,
          activeLeases: totalUnits,
          pendingMaintenance: 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Super Admin Portal Views ---
  async getSuperAdminBilling(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = await prisma.subscriptionPlan.findFirst();
      return sendSuccess({
        res,
        data: plan || {
          planName: 'Enterprise SaaS Tier',
          price: 499,
          billingCycle: 'Monthly',
          nextInvoice: new Date('2026-08-01'),
          usageLimit: 'Unlimited Properties',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getSuperAdminSecurity(req: Request, res: Response, next: NextFunction) {
    try {
      const policy = await prisma.securityPolicy.findFirst();
      return sendSuccess({
        res,
        data: policy || {
          mfaRequired: true,
          sessionTimeout: 30,
          passwordPolicy: 'Strong (min 10 chars, symbols)',
          ipWhitelist: '192.168.1.0/24',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getSuperAdminAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await prisma.auditLog.findMany({
        include: {
          user: true,
        },
        orderBy: { timestamp: 'desc' },
      });
      return sendSuccess({ res, data: logs });
    } catch (error) {
      next(error);
    }
  }

  // --- Collections & Other Operations ---
  async getCollectionPaymentPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await prisma.paymentPlan.findMany({
        include: {
          tenant: true,
        },
      });
      return sendSuccess({ res, data: plans });
    } catch (error) {
      next(error);
    }
  }

  async createCollectionPaymentPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, totalAmount, frequency } = req.body;
      const plan = await prisma.paymentPlan.create({
        data: {
          tenantId,
          totalAmount: parseFloat(totalAmount),
          frequency,
        },
      });
      return sendSuccess({ res, statusCode: 201, data: plan });
    } catch (error) {
      next(error);
    }
  }

  async getCrmLeads(req: Request, res: Response, next: NextFunction) {
    try {
      const leads = await prisma.crmLead.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess({ res, data: leads });
    } catch (error) {
      next(error);
    }
  }

  async createCrmLead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, name, firstName, lastName, email, phone, source, budget, moveInDate, priority, assignedAgent, notes, property, companyId, status } = req.body;

      if (id) {
        const existing = await prisma.crmLead.findUnique({
          where: { id },
        });
        if (existing) {
          const lead = await prisma.crmLead.update({
            where: { id },
            data: {
              name: name || undefined,
              email: email || undefined,
              phone: phone || undefined,
              source: source || undefined,
              status: status || undefined,
              budget: budget !== undefined ? (budget ? Number(budget) : null) : undefined,
              moveInDate: moveInDate !== undefined ? moveInDate : undefined,
              priority: priority || undefined,
              assignedAgent: assignedAgent !== undefined ? assignedAgent : undefined,
              notes: notes !== undefined ? notes : undefined,
              property: property !== undefined ? property : undefined,
              companyId: companyId !== undefined ? companyId : undefined,
            },
          });
          return sendSuccess({ res, data: lead });
        }
      }

      const resolvedName = name || [firstName, lastName].filter(Boolean).join(' ') || 'Unnamed Lead';
      const resolvedSource = source || 'Portal';
      const lead = await prisma.crmLead.create({
        data: { 
          name: resolvedName, 
          email, 
          phone, 
          source: resolvedSource,
          status: status || 'New',
          budget: budget ? Number(budget) : null,
          moveInDate: moveInDate || null,
          priority: priority || 'Medium',
          assignedAgent: assignedAgent || null,
          notes: notes || null,
          property: property || null,
          companyId: companyId || null,
        },
      });
      return sendSuccess({ res, statusCode: 201, data: lead });
    } catch (error) {
      next(error);
    }
  }

  async getScreeningReports(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const reports = await prisma.screeningReport.findMany({
        where: companyId ? { companyId } : {},
        include: {
          tenant: {
            include: {
              unit: {
                include: {
                  property: true,
                },
              },
            },
          },
        },
      });
      return sendSuccess({ res, data: reports });
    } catch (error) {
      next(error);
    }
  }

  async createScreeningReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      let { tenantId, firstName, lastName, email, phoneNumber, phone, unitId, creditScore, criminalPass, evictionPass, status } = req.body;
      const companyId = req.user?.companyId;

      if (!tenantId && email) {
        let tenant = await prisma.tenant.findUnique({
          where: { email },
        });

        if (!tenant) {
          tenant = await prisma.tenant.create({
            data: {
              firstName: firstName || 'Unnamed',
              lastName: lastName || 'Tenant',
              email,
              phone: phoneNumber || phone || 'N/A',
              unitId: unitId || null,
              status: 'Pending',
              companyId,
            },
          });
        }
        tenantId = tenant.id;
      }

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'tenantId or email is required to create a screening report',
          },
        });
      }

      const parsedCreditScore = parseInt(creditScore);
      const finalCreditScore = isNaN(parsedCreditScore) ? Math.floor(Math.random() * (800 - 680 + 1)) + 680 : parsedCreditScore;

      const report = await prisma.screeningReport.create({
        data: {
          tenantId,
          creditScore: finalCreditScore,
          criminalPass: criminalPass ?? true,
          evictionPass: evictionPass ?? true,
          status: status || 'Processing',
          companyId,
        },
      });
      return sendSuccess({ res, statusCode: 201, data: report });
    } catch (error) {
      next(error);
    }
  }

  async getViolations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const violations = await prisma.violation.findMany({
        where: companyId ? { companyId } : {},
        include: {
          unit: {
            include: { property: true },
          },
        },
      });
      return sendSuccess({ res, data: violations });
    } catch (error) {
      next(error);
    }
  }

  async createViolation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { unitId, title, description, fineAmount } = req.body;
      const companyId = req.user?.companyId;
      const violation = await prisma.violation.create({
        data: {
          unitId,
          title,
          description,
          fineAmount: parseFloat(fineAmount || '0'),
          companyId,
        },
      });
      return sendSuccess({ res, statusCode: 201, data: violation });
    } catch (error) {
      next(error);
    }
  }

  async getTenantMessages(req: Request, res: Response, next: NextFunction) {
    try {
      let messages = await prisma.tenantMessage.findMany({
        orderBy: { createdAt: 'desc' },
      });

      if (messages.length === 0) {
        await prisma.tenantMessage.createMany({
          data: [
            {
              sender: 'Property Manager Office',
              recipient: 'Alex Mercer',
              subject: 'Upcoming HVAC Maintenance Inspection',
              body: 'Hello Alex, please be advised that HVAC filters will be replaced this Thursday between 9 AM and 12 PM.',
            },
            {
              sender: 'Leasing Office',
              recipient: 'Alex Mercer',
              subject: 'Parking Pass Renewal Notice',
              body: 'Your reserved spot #42 parking pass is set to expire end of month. Reply to confirm auto-renewal.',
            },
          ],
        });

        messages = await prisma.tenantMessage.findMany({
          orderBy: { createdAt: 'desc' },
        });
      }

      const threads = [
        {
          id: 'thread-1',
          senderName: 'Property Manager Office',
          role: 'Management',
          unread: false,
          messages: messages
            .filter((m: any) => m.sender === 'Property Manager Office' || m.recipient === 'Property Manager Office')
            .map((m: any) => ({
              id: m.id,
              senderName: m.sender,
              role: m.sender.includes('Resident') ? 'Tenant' : 'Management',
              timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              date: new Date(m.createdAt).toISOString().split('T')[0],
              subject: m.subject,
              body: m.body,
            })),
        },
        {
          id: 'thread-2',
          senderName: 'Leasing Office',
          role: 'Leasing Desk',
          unread: true,
          messages: messages
            .filter((m: any) => m.sender === 'Leasing Office' || m.recipient === 'Leasing Office')
            .map((m: any) => ({
              id: m.id,
              senderName: m.sender,
              role: m.sender.includes('Resident') ? 'Tenant' : 'Leasing Desk',
              timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              date: new Date(m.createdAt).toISOString().split('T')[0],
              subject: m.subject,
              body: m.body,
            })),
        },
      ];

      return sendSuccess({ res, data: threads });
    } catch (error) {
      next(error);
    }
  }

  // --- Invoices ---
  async getInvoices(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      let whereClause: any = {};
      if (((req.user as any)?.role === 'Tenant' || req.user?.roleName === 'Tenant') && req.user?.email) {
        const tenant = await prisma.tenant.findFirst({ where: { email: req.user.email } });
        if (tenant) {
          whereClause.tenantId = tenant.id;
        } else {
          return sendSuccess({ res, data: [] });
        }
      }

      const invoices = await prisma.invoice.findMany({
        where: whereClause,
        include: { tenant: true },
        orderBy: { dueDate: 'asc' },
      });
      return sendSuccess({ res, data: invoices });
    } catch (error) {
      next(error);
    }
  }

  async createTenantMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await this.getTenantForUser(req);
      const tenantFullName = tenant ? `${tenant.firstName} ${tenant.lastName} (Resident)` : 'Resident';
      const { sender, recipient, subject, body } = req.body;

      const newMsg = await prisma.tenantMessage.create({
        data: {
          sender: sender || tenantFullName,
          recipient: recipient || 'Property Manager Office',
          subject: subject || 'General Inquiry',
          body: body || '',
        },
      });

      return sendSuccess({
        res,
        statusCode: 201,
        data: {
          id: newMsg.id,
          senderName: newMsg.sender,
          role: 'Tenant',
          timestamp: new Date(newMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date(newMsg.createdAt).toISOString().split('T')[0],
          subject: newMsg.subject,
          body: newMsg.body,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async createInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, amount, dueDate, status } = req.body;

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { leases: { include: { property: true } } }
      });

      const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Unknown Tenant';
      const lease = tenant?.leases?.[0];
      const propertyId = lease?.propertyId || 'default-property';
      const propertyName = lease?.property?.name || 'Unknown Property';

      const invoice = await prisma.invoice.create({
        data: {
          tenantId,
          tenantName,
          propertyId,
          propertyName,
          amount: parseFloat(amount || '0'),
          balance: parseFloat(amount || '0'),
          dueDate: String(dueDate || new Date().toISOString().split('T')[0]),
          status: status || 'Sent',
          lineItems: JSON.stringify(req.body.lineItems || []),
        },
      });
      return sendSuccess({ res, statusCode: 201, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  async deleteInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      await prisma.invoice.delete({
        where: { id: req.params.id as string },
      });
      return sendSuccess({ res, data: { success: true } });
    } catch (error) {
      next(error);
    }
  }

  // --- Charges ---
  async getCharges(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      let whereClause: any = {};
      if (((req.user as any)?.role === 'Tenant' || req.user?.roleName === 'Tenant') && req.user?.email) {
        const tenant = await prisma.tenant.findFirst({ where: { email: req.user.email } });
        if (tenant) {
          whereClause.tenantId = tenant.id;
        } else {
          return sendSuccess({ res, data: [] });
        }
      }

      const charges = await prisma.charge.findMany({
        where: whereClause,
        include: { tenant: true },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess({ res, data: charges });
    } catch (error) {
      next(error);
    }
  }

  async createCharge(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, title, amount, status } = req.body;
      const charge = await prisma.charge.create({
        data: {
          tenantId,
          title,
          amount: parseFloat(amount || '0'),
          status: status || 'Active',
        },
      });
      return sendSuccess({ res, statusCode: 201, data: charge });
    } catch (error) {
      next(error);
    }
  }

  async deleteCharge(req: Request, res: Response, next: NextFunction) {
    try {
      await prisma.charge.delete({
        where: { id: req.params.id as string },
      });
      return sendSuccess({ res, data: { success: true } });
    } catch (error) {
      next(error);
    }
  }

  // --- Deposits ---
  async getDeposits(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      let whereClause: any = {};
      if (((req.user as any)?.role === 'Tenant' || req.user?.roleName === 'Tenant') && req.user?.email) {
        const tenant = await prisma.tenant.findFirst({ where: { email: req.user.email } });
        if (tenant) {
          whereClause.tenantId = tenant.id;
        } else {
          return sendSuccess({ res, data: [] });
        }
      }

      const deposits = await prisma.deposit.findMany({
        where: whereClause,
        include: { tenant: true },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess({ res, data: deposits });
    } catch (error) {
      next(error);
    }
  }

  async getTenantNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      let notes = await prisma.tenantNotification.findMany({
        orderBy: { createdAt: 'desc' },
      });

      if (notes.length === 0) {
        await prisma.tenantNotification.createMany({
          data: [
            {
              title: 'Monthly Rent Statement Ready',
              message: 'Your monthly rent invoice for August 2026 is available for download.',
              type: 'info',
            },
            {
              title: 'Maintenance Request Scheduled',
              message: 'Work order #WO-1042 for HVAC repair is assigned for Thursday at 10 AM.',
              type: 'success',
            },
            {
              title: 'Package Arrived at Front Desk',
              message: 'A parcel from Amazon Logistics is waiting at reception.',
              type: 'warning',
            },
          ],
        });

        notes = await prisma.tenantNotification.findMany({
          orderBy: { createdAt: 'desc' },
        });
      }

      const formatted = notes.map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type || 'info',
        role: 'Tenant',
        read: n.read,
        timestamp: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date(n.createdAt).toISOString().split('T')[0],
      }));

      return sendSuccess({ res, data: formatted });
    } catch (error) {
      next(error);
    }
  }

  async markTenantNotificationRead(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      if (id === 'all') {
        await prisma.tenantNotification.updateMany({
          data: { read: true },
        });
      } else {
        await prisma.tenantNotification.update({
          where: { id },
          data: { read: true },
        });
      }
      return sendSuccess({ res, message: 'Notification mark as read' });
    } catch (error) {
      next(error);
    }
  }

  async clearTenantNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      await prisma.tenantNotification.deleteMany({});
      return sendSuccess({ res, message: 'All notifications cleared' });
    } catch (error) {
      next(error);
    }
  }

  async getStaffProfile(req: Request, res: Response, next: NextFunction) {
    try {
      let staff = await prisma.staffProfile.findFirst();
      if (!staff) {
        staff = await prisma.staffProfile.create({
          data: {
            name: 'Marcus Vance',
            specialist: 'Senior Maintenance Lead',
            email: 'marcus.vance@apexpm.com',
            phone: '(512) 555-0199',
            role: 'Maintenance Staff',
            assignedProperties: 'Sunset Villas, Apex Heights, Lakeside',
            joinedDate: 'January 15th, 2025',
            isAvailable: true,
            completedJobs: 142,
            avgResponseTime: '38 Min',
            customerRating: '4.92 / 5.0',
          },
        });
      }

      return sendSuccess({ res, data: staff });
    } catch (error) {
      next(error);
    }
  }

  async updateStaffProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { isAvailable, name, email, phone } = req.body;
      let staff = await prisma.staffProfile.findFirst();

      if (!staff) {
        staff = await prisma.staffProfile.create({
          data: {
            name: name || 'Marcus Vance',
            specialist: 'Senior Maintenance Lead',
            email: email || 'marcus.vance@apexpm.com',
            phone: phone || '(512) 555-0199',
            isAvailable: typeof isAvailable === 'boolean' ? isAvailable : true,
          },
        });
      } else {
        staff = await prisma.staffProfile.update({
          where: { id: staff.id },
          data: {
            ...(typeof isAvailable === 'boolean' && { isAvailable }),
            ...(name && { name }),
            ...(email && { email }),
            ...(phone && { phone }),
          },
        });
      }

      return sendSuccess({ res, data: staff });
    } catch (error) {
      next(error);
    }
  }

  async getStaffTasks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const userEmail = req.user?.email;

      let vendor: any = null;
      if (userEmail) {
        vendor = await prisma.vendor.findFirst({ where: { email: userEmail } });
      }

      // Build query filter for ServiceRequests
      const srWhere: any = {};
      if (companyId) {
        srWhere.companyId = companyId;
      }
      if (vendor) {
        srWhere.OR = [
          { assignedVendorId: vendor.id },
          { assignedVendorName: vendor.contactName || vendor.companyName },
          { assignedTechnician: vendor.contactName }
        ];
        if (companyId) {
          srWhere.companyId = companyId;
        }
      }

      // Build query filter for WorkOrders
      const woWhere: any = {};
      if (companyId) {
        woWhere.companyId = companyId;
      }
      if (vendor) {
        woWhere.vendorId = vendor.id;
      }

      // 1. Fetch ServiceRequests
      const serviceRequests = await prisma.serviceRequest.findMany({
        where: Object.keys(srWhere).length > 0 ? srWhere : (companyId ? { companyId } : {}),
        orderBy: { createdAt: 'desc' },
      });

      // 2. Fetch WorkOrders
      const workOrders = await prisma.workOrder.findMany({
        where: Object.keys(woWhere).length > 0 ? woWhere : (companyId ? { companyId } : {}),
        include: { property: true, vendor: true },
        orderBy: { createdAt: 'desc' },
      });

      const formattedServiceRequests = serviceRequests.map((sr: any) => ({
        id: sr.id,
        workOrderNumber: `SR-${sr.id.slice(0, 8).toUpperCase()}`,
        propertyName: sr.propertyName || 'Property',
        unitNumber: sr.unitNumber ? (sr.unitNumber.toLowerCase().includes('unit') ? sr.unitNumber : `Unit ${sr.unitNumber}`) : '',
        issue: sr.title,
        category: sr.category || (sr.title.toLowerCase().includes('hvac') ? 'HVAC' : sr.title.toLowerCase().includes('plumbing') ? 'Plumbing' : 'General'),
        priority: sr.priority === 'Normal' ? 'Medium' : sr.priority || 'Medium',
        status: sr.status === 'Open' || sr.status === 'New' || sr.status === 'Submitted' ? 'New' : sr.status === 'InProgress' || sr.status === 'In Progress' ? 'In Progress' : sr.status === 'Completed' ? 'Completed' : sr.status === 'Closed' ? 'Closed' : sr.status === 'Rejected' ? 'Rejected' : sr.status === 'Assigned' ? 'Assigned' : sr.status || 'New',
        assignedTechnician: sr.assignedVendorName || sr.assignedTechnician || (vendor ? (vendor.contactName || vendor.companyName) : 'Maintenance Staff'),
        dueDate: sr.scheduledDate || (sr.createdAt ? new Date(sr.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        createdAt: sr.createdAt ? new Date(sr.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        description: sr.description || '',
        estimatedCost: sr.estimatedCost || sr.cost || 0,
        actualCost: sr.cost || 0,
        labourCost: 0,
        materialsCost: 0,
        extraExpenses: 0,
        rejectReason: sr.notes || null,
        resolutionNotes: null,
      }));

      const formattedWorkOrders = workOrders.map((wo: any, index: number) => ({
        id: wo.id,
        workOrderNumber: `WO-${1001 + index}`,
        propertyName: wo.property?.name || 'Property',
        unitNumber: 'Unit 101',
        issue: wo.title,
        category: wo.title.toLowerCase().includes('hvac') ? 'HVAC' : wo.title.toLowerCase().includes('plumbing') ? 'Plumbing' : 'General',
        priority: wo.priority === 'Normal' ? 'Medium' : wo.priority || 'Medium',
        status: wo.status === 'Open' || wo.status === 'Submitted' ? 'New' : wo.status === 'InProgress' ? 'In Progress' : wo.status === 'Completed' ? 'Completed' : wo.status === 'Closed' ? 'Closed' : wo.status === 'Rejected' ? 'Rejected' : wo.status === 'Assigned' ? 'Assigned' : wo.status || 'New',
        assignedTechnician: wo.vendor?.contactName || wo.vendor?.companyName || 'Maintenance Staff',
        dueDate: wo.createdAt ? new Date(wo.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        createdAt: wo.createdAt ? new Date(wo.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        description: wo.description || '',
        estimatedCost: wo.estimatedCost || 0,
        actualCost: wo.actualCost || 0,
        labourCost: wo.labourCost || 0,
        materialsCost: wo.materialsCost || 0,
        extraExpenses: wo.extraExpenses || 0,
        rejectReason: wo.rejectReason || null,
        resolutionNotes: wo.resolutionNotes || null,
      }));

      const combined = [...formattedServiceRequests, ...formattedWorkOrders];
      return sendSuccess({ res, data: combined });
    } catch (error) {
      next(error);
    }
  }

  async updateStaffTaskStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status, actualCost, rejectReason, resolutionNotes, labourCost, materialsCost, extraExpenses } = req.body;

      const statusMap: Record<string, string> = {
        'Open': 'Open',
        'New': 'Submitted',
        'Submitted': 'Submitted',
        'Approved': 'Approved',
        'Assigned': 'Assigned',
        'Accepted': 'Accepted',
        'InProgress': 'InProgress',
        'In Progress': 'InProgress',
        'In_Progress': 'InProgress',
        'Completed': 'Completed',
        'Rejected': 'Rejected',
        'Cancelled': 'Cancelled',
        'Closed': 'Closed',
        'Returned': 'Returned',
      };

      const mappedStatus = status ? (statusMap[status] ?? status) : undefined;

      const finalLabour = labourCost !== undefined && labourCost !== null ? parseFloat(String(labourCost)) : 0;
      const finalMaterials = materialsCost !== undefined && materialsCost !== null ? parseFloat(String(materialsCost)) : 0;
      const finalExtra = extraExpenses !== undefined && extraExpenses !== null ? parseFloat(String(extraExpenses)) : 0;

      const computedCost = (labourCost !== undefined || materialsCost !== undefined || extraExpenses !== undefined)
        ? (finalLabour + finalMaterials + finalExtra)
        : (actualCost !== undefined && actualCost !== null ? parseFloat(String(actualCost)) : undefined);

      // First check ServiceRequest table
      const existingSr = await prisma.serviceRequest.findUnique({ where: { id } });
      if (existingSr) {
        const srStatus = mappedStatus === 'InProgress' ? 'In Progress' : mappedStatus;
        const updatedSr = await prisma.serviceRequest.update({
          where: { id },
          data: {
            ...(srStatus && { status: srStatus }),
            ...(computedCost !== undefined && { cost: computedCost }),
            ...(rejectReason && { notes: rejectReason }),
          },
        });
        return sendSuccess({ res, data: updatedSr });
      }

      // Check WorkOrder table
      const existingWo = await prisma.workOrder.findUnique({ where: { id } });
      if (existingWo) {
        const order = await prisma.workOrder.update({
          where: { id },
          data: {
            ...(mappedStatus && { status: mappedStatus as any }),
            ...(computedCost !== undefined && { actualCost: computedCost }),
            ...(labourCost !== undefined && labourCost !== null && { labourCost: parseFloat(String(labourCost)) }),
            ...(materialsCost !== undefined && materialsCost !== null && { materialsCost: parseFloat(String(materialsCost)) }),
            ...(extraExpenses !== undefined && extraExpenses !== null && { extraExpenses: parseFloat(String(extraExpenses)) }),
            ...(rejectReason && { rejectReason }),
            ...(resolutionNotes && { resolutionNotes }),
            ...(mappedStatus === 'Completed' && { completedAt: new Date() }),
          },
        });
        return sendSuccess({ res, data: order });
      }

      return res.status(404).json({ success: false, error: { message: 'Task not found' } });
    } catch (error) {
      next(error);
    }
  }

  async createDeposit(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, amount, status } = req.body;
      const deposit = await prisma.deposit.create({
        data: {
          tenantId,
          amount: parseFloat(amount || '0'),
          status: status || 'Held',
        },
      });
      return sendSuccess({ res, statusCode: 201, data: deposit });
    } catch (error) {
      next(error);
    }
  }

  async deleteDeposit(req: Request, res: Response, next: NextFunction) {
    try {
      await prisma.deposit.delete({
        where: { id: req.params.id as string },
      });
      return sendSuccess({ res, data: { success: true } });
    } catch (error) {
      next(error);
    }
  }

  // --- Expenses ---
  async getExpenses(req: Request, res: Response, next: NextFunction) {
    try {
      const expenses = await prisma.expense.findMany({
        orderBy: { date: 'desc' },
      });
      return sendSuccess({ res, data: expenses });
    } catch (error) {
      next(error);
    }
  }

  async createExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, amount, date, description } = req.body;
      const parsedAmount = parseFloat(amount || '0');
      const companyId = (req as AuthenticatedRequest).user?.companyId;

      let parsedDesc: any = {};
      try {
        parsedDesc = JSON.parse(description || '{}');
      } catch (e) {
        parsedDesc = {};
      }

      const payeeType = parsedDesc.payeeType || req.body.payeeType || 'Vendor';
      const payeeId = parsedDesc.payeeId || req.body.payeeId || '';
      const propertyId = parsedDesc.propertyId || req.body.propertyId || null;
      const propertyName = parsedDesc.propertyName || req.body.propertyName || 'Property';
      const unitId = parsedDesc.unitId || req.body.unitId || null;

      const expense = await prisma.$transaction(async (tx) => {
        const exp = await tx.expense.create({
          data: {
            category,
            amount: parsedAmount,
            date: new Date(date || Date.now()),
            description: description || '',
          },
        });

        // 1. Debit (Increase) Expense account: e.g. "5010" or first Account of type "Expense"
        const expenseAccount = await tx.coAAccount.findFirst({
          where: companyId
            ? { companyId, OR: [{ accountCode: '5010' }, { type: 'Expense' }] }
            : { OR: [{ accountCode: '5010' }, { type: 'Expense' }] }
        });
        if (expenseAccount) {
          await tx.coAAccount.update({
            where: { id: expenseAccount.id },
            data: { balance: { increment: parsedAmount } }
          });
        }

        // 2. Credit (Decrease) Checking Account: e.g. "1010" or first Account of type "Asset"
        const checkingAccount = await tx.coAAccount.findFirst({
          where: companyId
            ? { companyId, OR: [{ accountCode: '1010' }, { type: 'Asset' }] }
            : { OR: [{ accountCode: '1010' }, { type: 'Asset' }] }
        });
        if (checkingAccount) {
          await tx.coAAccount.update({
            where: { id: checkingAccount.id },
            data: { balance: { decrement: parsedAmount } }
          });
        }

        // 3. Multi-Tenant SaaS Auto-Sync:
        // If Payee Type is 'Owner' (Property Owner Distribution)
        if (payeeType === 'Owner' || payeeType === 'Property Owner (Distribution)' || category?.toLowerCase().includes('distribution')) {
          let ownerIdToUse = payeeId;
          if (!ownerIdToUse && propertyId) {
            const prop = await tx.property.findUnique({ where: { id: propertyId } });
            if (prop && (prop as any).ownerId) {
              ownerIdToUse = (prop as any).ownerId;
            }
          }
          if (!ownerIdToUse) {
            const firstOwner = await tx.owner.findFirst({
              where: companyId ? { companyId } : {},
            });
            if (firstOwner) ownerIdToUse = firstOwner.id;
          }

          if (ownerIdToUse) {
            await tx.ownerDistribution.create({
              data: {
                ownerId: ownerIdToUse,
                amount: parsedAmount,
                status: 'Completed',
                processedDate: new Date(date || Date.now()),
                period: propertyName ? `${propertyName} Distribution` : 'Property Distribution',
              },
            });
          }
        }

        // If Payee Type is 'Tenant' (Refund / Return)
        if (payeeType === 'Tenant' || payeeType === 'Tenant (Refund / Return)' || category?.toLowerCase().includes('refund')) {
          let tenantIdToUse = payeeId;
          let tenantObj: any = null;
          if (tenantIdToUse) {
            tenantObj = await tx.tenant.findUnique({ where: { id: tenantIdToUse }, include: { leases: true } });
          } else {
            tenantObj = await tx.tenant.findFirst({
              where: companyId ? { companyId } : {},
              include: { leases: true },
            });
            if (tenantObj) tenantIdToUse = tenantObj.id;
          }

          if (tenantObj && tenantIdToUse) {
            const lease = tenantObj.leases?.[0];
            await tx.rentPayment.create({
              data: {
                tenantId: tenantIdToUse,
                propertyId: tenantObj.propertyId || propertyId || 'default-property',
                unitId: tenantObj.unitId || unitId || 'default-unit',
                leaseId: lease?.id || 'default-lease',
                amount: parsedAmount,
                dueDate: new Date(date || Date.now()),
                paidDate: new Date(date || Date.now()),
                paymentMethod: 'ACH',
                status: 'Paid',
                referenceNumber: `REFUND-${Date.now()}`,
                companyId: companyId || tenantObj.companyId || null,
              },
            });
          }
        }

        return exp;
      });

      return sendSuccess({ res, statusCode: 201, data: expense });
    } catch (error) {
      next(error);
    }
  }

  async deleteExpense(req: Request, res: Response, next: NextFunction) {
    try {
      await prisma.expense.delete({
        where: { id: req.params.id as string },
      });
      return sendSuccess({ res, data: { success: true } });
    } catch (error) {
      next(error);
    }
  }

  // --- Maintenance Requests ---
  async getMaintenanceRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const reqs = await prisma.maintenanceRequest.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess({ res, data: reqs });
    } catch (error) {
      next(error);
    }
  }

  async createMaintenanceRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, propertyName, unitNumber, priority, status } = req.body;
      const request = await prisma.maintenanceRequest.create({
        data: {
          title,
          description,
          propertyName,
          unitNumber,
          priority: priority || 'Normal',
          status: status || 'New',
        },
      });
      return sendSuccess({ res, statusCode: 201, data: request });
    } catch (error) {
      next(error);
    }
  }

  async updateMaintenanceRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, priority, title, description } = req.body;
      const request = await prisma.maintenanceRequest.update({
        where: { id: req.params.id as string },
        data: { status, priority, title, description },
      });
      return sendSuccess({ res, data: request });
    } catch (error) {
      next(error);
    }
  }

  async deleteMaintenanceRequest(req: Request, res: Response, next: NextFunction) {
    try {
      await prisma.maintenanceRequest.delete({
        where: { id: req.params.id as string },
      });
      return sendSuccess({ res, data: { success: true } });
    } catch (error) {
      next(error);
    }
  }

  // --- Inspections ---
  async getInspections(req: Request, res: Response, next: NextFunction) {
    try {
      const inspections = await prisma.inspection.findMany({
        orderBy: { startedAt: 'asc' },
      });
      return sendSuccess({ res, data: inspections });
    } catch (error) {
      next(error);
    }
  }

  async createInspection(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, date } = req.body;
      const count = await prisma.inspection.count();
      const formattedCount = String(count + 1).padStart(6, '0');
      const inspection = await prisma.inspection.create({
        data: {
          inspectionNumber: `MI-${formattedCount}`,
          status: (status as any) || 'DRAFT',
          startedAt: date ? new Date(date) : new Date(),
          templateName: 'Standard Template',
          templateVersion: 1,
        },
      });
      return sendSuccess({ res, statusCode: 201, data: inspection });
    } catch (error) {
      next(error);
    }
  }

  async updateInspection(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, date } = req.body;
      const inspection = await prisma.inspection.update({
        where: { id: req.params.id as string },
        data: {
          status: status as any,
          startedAt: date ? new Date(date) : undefined,
        },
      });
      return sendSuccess({ res, data: inspection });
    } catch (error) {
      next(error);
    }
  }

  async deleteInspection(req: Request, res: Response, next: NextFunction) {
    try {
      await prisma.inspection.delete({
        where: { id: req.params.id as string },
      });
      return sendSuccess({ res, data: { success: true } });
    } catch (error) {
      next(error);
    }
  }

  // --- Income ---
  async getIncome(req: Request, res: Response, next: NextFunction) {
    try {
      const incomes = await prisma.income.findMany({
        orderBy: { date: 'desc' },
      });
      return sendSuccess({ res, data: incomes });
    } catch (error) {
      next(error);
    }
  }

  async createIncome(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, amount, date, description, status } = req.body;
      const income = await prisma.income.create({
        data: {
          category,
          amount: parseFloat(amount || '0'),
          date: new Date(date || Date.now()),
          description: description || '',
          status: status || 'Cleared',
        },
      });
      return sendSuccess({ res, statusCode: 201, data: income });
    } catch (error) {
      next(error);
    }
  }

  async deleteIncome(req: Request, res: Response, next: NextFunction) {
    try {
      await prisma.income.delete({
        where: { id: req.params.id as string },
      });
      return sendSuccess({ res, data: { success: true } });
    } catch (error) {
      next(error);
    }
  }

  // --- Signatures ---
  async getSignatures(req: Request, res: Response, next: NextFunction) {
    try {
      const signatures = await prisma.signature.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess({ res, data: signatures });
    } catch (error) {
      next(error);
    }
  }

  async createSignature(req: Request, res: Response, next: NextFunction) {
    try {
      const { documentName, documentId, recipientName, recipientEmail, expiresAt } = req.body;
      const signature = await prisma.signature.create({
        data: {
          documentName,
          documentId,
          recipientName,
          recipientEmail,
          status: 'Sent',
          expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      return sendSuccess({ res, statusCode: 201, data: signature });
    } catch (error) {
      next(error);
    }
  }

  async cancelSignature(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = await prisma.signature.update({
        where: { id: req.params.id as string },
        data: { status: 'Cancelled' },
      });
      return sendSuccess({ res, data: signature });
    } catch (error) {
      next(error);
    }
  }

  async updateScreeningReport(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status } = req.body;

      const updateData: any = { status };
      if (status === 'Completed') {
        updateData.creditScore = 720;
        updateData.criminalPass = true;
        updateData.evictionPass = true;
      }

      const report = await prisma.screeningReport.update({
        where: { id },
        data: updateData,
        include: { tenant: true },
      });

      if (status === 'Approved' && report.tenantId) {
        await prisma.tenant.update({
          where: { id: report.tenantId },
          data: { status: 'Active' },
        });

        if (report.tenant?.email) {
          const app = await prisma.application.findFirst({
            where: { email: report.tenant.email },
          });
          if (app) {
            await prisma.application.update({
              where: { id: app.id },
              data: { status: 'Approved' },
            });
          }
        }
      } else if (status === 'Declined' && report.tenantId) {
        await prisma.tenant.update({
          where: { id: report.tenantId },
          data: { status: 'Inactive' },
        });

        if (report.tenant?.email) {
          const app = await prisma.application.findFirst({
            where: { email: report.tenant.email },
          });
          if (app) {
            await prisma.application.update({
              where: { id: app.id },
              data: { status: 'Rejected' },
            });
          }
        }
      }

      return sendSuccess({ res, data: report });
    } catch (error) {
      next(error);
    }
  }
}

export const portalController = new PortalController();
