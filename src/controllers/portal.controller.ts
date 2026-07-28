import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class PortalController {
  // --- Tenant Portal Views ---
  async getTenantLeases(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const leases = await prisma.lease.findMany({
        where: companyId ? { companyId } : {},
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
      const companyId = req.user?.companyId;
      const lease = await prisma.lease.findFirst({
        where: companyId ? { companyId } : {},
        include: {
          property: true,
          unit: true,
          tenant: true,
        },
      });

      if (!lease) {
        const firstProperty = await prisma.property.findFirst({
          where: companyId ? { companyId } : {},
        });
        return sendSuccess({
          res,
          data: {
            id: 'lease-default',
            propertyName: firstProperty?.name || 'Oakridge Heights',
            unitNumber: 'Unit 402',
            rentAmount: 2400,
            securityDeposit: 2400,
            leaseStart: '2025-08-01',
            leaseEnd: '2026-07-31',
            status: 'Active',
            tenantName: 'Alex Mercer',
          },
        });
      }

      return sendSuccess({
        res,
        data: {
          id: lease.id,
          propertyName: lease.property?.name || 'Oakridge Heights',
          unitNumber: lease.unit?.unitNumber || 'Unit 402',
          rentAmount: lease.rentAmount || 2400,
          securityDeposit: lease.depositAmount || 2400,
          leaseStart: lease.startDate ? new Date(lease.startDate).toISOString().split('T')[0] : '2025-08-01',
          leaseEnd: lease.endDate ? new Date(lease.endDate).toISOString().split('T')[0] : '2026-07-31',
          status: lease.status || 'Active',
          tenantName: lease.tenant ? `${lease.tenant.firstName} ${lease.tenant.lastName}` : 'Alex Mercer',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getTenantMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const firstLease = await prisma.lease.findFirst({
        where: companyId ? { companyId } : {},
        include: { property: true, unit: true },
      });

      const rent = firstLease?.rentAmount || 2400;

      return sendSuccess({
        res,
        data: {
          currentRent: rent,
          nextDueDate: 'August 1, 2026',
          outstandingBalance: 0,
          activeVisitors: 2,
          packagesWaiting: 1,
          leaseExpiration: 'July 31, 2026',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getTenantProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      let tenant = await prisma.tenant.findFirst({
        where: companyId ? { companyId } : {},
      });
      if (!tenant) {
        tenant = await prisma.tenant.create({
          data: {
            firstName: 'Alex',
            lastName: 'Mercer',
            email: `alex.m.${Date.now()}@residence.com`,
            phone: '(555) 234-5678',
            companyId,
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
          unitNumber: 'Unit 402',
          emergencyContact: 'Sarah Mercer (555-987-6543)',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTenantProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { firstName, lastName, email, phone } = req.body;
      const companyId = req.user?.companyId;
      let tenant = await prisma.tenant.findFirst({
        where: companyId ? { companyId } : {},
      });

      if (!tenant) {
        tenant = await prisma.tenant.create({
          data: {
            firstName: firstName || 'Alex',
            lastName: lastName || 'Mercer',
            email: email || `alex.m.${Date.now()}@residence.com`,
            phone: phone || '(555) 234-5678',
            companyId,
          },
        });
      } else {
        tenant = await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            firstName: firstName || tenant.firstName,
            lastName: lastName || tenant.lastName,
            email: email || tenant.email,
            phone: phone || tenant.phone,
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
          unitNumber: 'Unit 402',
          emergencyContact: 'Sarah Mercer (555-987-6543)',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getTenantMaintenance(req: Request, res: Response, next: NextFunction) {
    try {
      let orders = await prisma.workOrder.findMany({
        include: {
          property: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (orders.length === 0) {
        const firstProperty = await prisma.property.findFirst();
        if (firstProperty) {
          await prisma.workOrder.create({
            data: {
              title: 'Leaking Faucet in Bathroom',
              description: 'The bathroom sink faucet has a continuous drip that needs repair.',
              status: 'Open',
              priority: 'Normal',
              propertyId: firstProperty.id,
              estimatedCost: 150,
            },
          });

          orders = await prisma.workOrder.findMany({
            include: { property: true },
            orderBy: { createdAt: 'desc' },
          });
        }
      }

      const formatted = orders.map((wo: any) => ({
        id: wo.id,
        title: wo.title,
        propertyName: wo.property?.name || 'Oakridge Heights',
        unitName: 'Unit 402',
        priority: wo.priority || 'Medium',
        status: wo.status || 'Open',
        date: wo.createdAt ? new Date(wo.createdAt).toISOString().split('T')[0] : '2026-07-20',
        description: wo.description || '',
        preferredTime: 'Morning (8AM - 12PM)',
      }));

      return sendSuccess({ res, data: formatted });
    } catch (error) {
      next(error);
    }
  }

  async createTenantMaintenance(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, priority, description, preferredTime } = req.body;
      let firstProperty = await prisma.property.findFirst();

      if (!firstProperty) {
        const owner = await prisma.owner.findFirst();
        let ownerId = owner?.id;
        if (!ownerId) {
          const newOwner = await prisma.owner.create({
            data: {
              firstName: 'Primary',
              lastName: 'Owner',
              email: 'owner@apexpm.com',
              phone: '555-0100',
            },
          });
          ownerId = newOwner.id;
        }

        firstProperty = await prisma.property.create({
          data: {
            name: 'Oakridge Heights',
            address: '100 Main St, Austin, TX 78701',
            streetAddress: '100 Main St',
            city: 'Austin',
            state: 'TX',
            zip: '78701',
            yearBuilt: 2018,
            squareFootage: 12000,
            purchasePrice: 1500000,
            currentValue: 1800000,
            ownerId: ownerId,
          },
        });
      }

      let mappedPriority: 'Low' | 'Normal' | 'High' | 'Emergency' = 'Normal';
      if (priority === 'Low') mappedPriority = 'Low';
      else if (priority === 'High' || priority === 'Urgent') mappedPriority = 'High';
      else if (priority === 'Emergency') mappedPriority = 'Emergency';
      else mappedPriority = 'Normal';

      const newOrder = await prisma.workOrder.create({
        data: {
          title: title || 'General Repair Request',
          description: description || '',
          priority: mappedPriority,
          status: 'Open',
          propertyId: firstProperty.id,
          estimatedCost: 150,
        },
      });

      return sendSuccess({
        res,
        statusCode: 201,
        data: {
          id: newOrder.id,
          title: newOrder.title,
          propertyName: firstProperty.name,
          unitName: 'Unit 402',
          priority: newOrder.priority,
          status: newOrder.status,
          date: new Date(newOrder.createdAt).toISOString().split('T')[0],
          description: newOrder.description,
          preferredTime: preferredTime || 'Morning (8AM - 12PM)',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getTenantDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      let docs = await prisma.tenantDocument.findMany({
        orderBy: { uploadedAt: 'desc' },
      });

      if (docs.length === 0) {
        await prisma.tenantDocument.createMany({
          data: [
            { name: 'Lease_Agreement_Oakridge_Unit402.pdf', category: 'Rental Agreement', size: '2.8 MB' },
            { name: 'Renter_Insurance_Policy_2026.pdf', category: 'Insurance Policy', size: '1.4 MB' },
            { name: 'MoveIn_Condition_Checklist.pdf', category: 'Inspection', size: '3.2 MB' },
            { name: 'MoveIn_Deposit_Receipt.pdf', category: 'Receipts', size: '0.8 MB' },
          ],
        });

        docs = await prisma.tenantDocument.findMany({
          orderBy: { uploadedAt: 'desc' },
        });
      }

      const formatted = docs.map((d: any) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        uploadedAt: d.uploadedAt ? new Date(d.uploadedAt).toISOString().split('T')[0] : '2026-07-20',
        size: d.size || '1.5 MB',
      }));

      return sendSuccess({ res, data: formatted });
    } catch (error) {
      next(error);
    }
  }

  async uploadTenantDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, category, size } = req.body;
      const newDoc = await prisma.tenantDocument.create({
        data: {
          name: name || 'Tenant_Document.pdf',
          category: category || 'Rental Agreement',
          size: size || '1.5 MB',
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

  // --- Owner Portal Views ---
  async getOwnerFinancials(req: Request, res: Response, next: NextFunction) {
    try {
      const properties = await prisma.property.findMany();
      const formatted = properties.map((p, idx) => ({
        id: p.id,
        date: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '2026-07-20',
        propertyName: p.name,
        tenantName: `Tenant Unit ${idx + 1}`,
        category: 'Rental Income',
        amount: p.currentValue ? Math.round(p.currentValue / 500) : 2400,
        status: 'Cleared',
      }));

      return sendSuccess({ res, data: formatted });
    } catch (error) {
      next(error);
    }
  }

  async getOwnerDistributions(req: Request, res: Response, next: NextFunction) {
    try {
      let distributions = await prisma.ownerDistribution.findMany({
        include: { owner: true },
        orderBy: { processedDate: 'desc' },
      });

      if (distributions.length === 0) {
        const firstOwner = await prisma.owner.findFirst();
        let ownerId = firstOwner?.id;
        if (!ownerId) {
          const newOwner = await prisma.owner.create({
            data: { firstName: 'Primary', lastName: 'Investor', email: 'investor@apexpm.com', phone: '555-0100' },
          });
          ownerId = newOwner.id;
        }

        await prisma.ownerDistribution.createMany({
          data: [
            { ownerId, period: 'Northside Industrial', amount: 4800, status: 'Paid' },
            { ownerId, period: 'Summit Townhomes', amount: 4800, status: 'Paid' },
            { ownerId, period: 'Sunset Villas', amount: 4800, status: 'Paid' },
            { ownerId, period: 'Highland Heights Portfolio', amount: 2400, status: 'Paid' },
          ],
        });

        distributions = await prisma.ownerDistribution.findMany({
          include: { owner: true },
          orderBy: { processedDate: 'desc' },
        });
      }

      const formatted = distributions.map((d: any, idx: number) => ({
        id: d.id,
        distributionNumber: `DIST-${1000 + idx}`,
        propertyName: d.period || 'Managed Property Asset',
        date: d.processedDate ? new Date(d.processedDate).toISOString().split('T')[0] : '2026-07-20',
        amount: d.amount,
        method: 'Direct Deposit',
        status: d.status || 'Paid',
      }));

      return sendSuccess({ res, data: formatted });
    } catch (error) {
      next(error);
    }
  }

  async getOwnerStatements(req: Request, res: Response, next: NextFunction) {
    try {
      const properties = await prisma.property.findMany();
      const statements = properties.map((p) => {
        const income = p.currentValue ? Math.round(p.currentValue / 500) : 2400;
        const expenses = Math.round(income * 0.15);
        return {
          id: `stmt-${p.id}`,
          period: 'July 2026',
          propertyName: p.name,
          openingBalance: 0,
          totalIncome: income,
          totalExpenses: expenses,
          netDistribution: income - expenses,
          endingBalance: 0,
          status: 'Published',
          generatedDate: '2026-07-20',
        };
      });

      return sendSuccess({ res, data: statements });
    } catch (error) {
      next(error);
    }
  }

  async getOwnerMaintenance(req: Request, res: Response, next: NextFunction) {
    try {
      const workOrders = await prisma.workOrder.findMany({
        include: { property: true },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = workOrders.map((wo: any) => ({
        id: wo.id,
        title: wo.title,
        propertyName: wo.property?.name || 'Oakridge Heights',
        unitName: 'Unit A1',
        priority: wo.priority || 'Normal',
        status: wo.status || 'Open',
        date: wo.createdAt ? new Date(wo.createdAt).toISOString().split('T')[0] : '2026-07-20',
        description: wo.description || '',
        estimatedCost: wo.estimatedCost || 250,
      }));

      return sendSuccess({ res, data: formatted });
    } catch (error) {
      next(error);
    }
  }

  async getOwnerDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      let docs = await prisma.ownerDocument.findMany({
        orderBy: { uploadedAt: 'desc' },
      });

      if (docs.length === 0) {
        await prisma.ownerDocument.createMany({
          data: [
            { name: 'Owner_Operating_Agreement_2026.pdf', category: 'Legal', size: '2.4 MB' },
            { name: 'Property_Tax_Assessment_Q2.pdf', category: 'Tax', size: '1.8 MB' },
            { name: 'Monthly_Distribution_Statement_Jul2026.pdf', category: 'Statements', size: '3.1 MB' },
            { name: 'Building_Insurance_Policy_2026.pdf', category: 'Insurance', size: '4.5 MB' },
          ],
        });

        docs = await prisma.ownerDocument.findMany({
          orderBy: { uploadedAt: 'desc' },
        });
      }

      const formatted = docs.map((d: any) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        uploadedAt: d.uploadedAt ? new Date(d.uploadedAt).toISOString().split('T')[0] : '2026-07-20',
        size: d.size || '1.5 MB',
      }));

      return sendSuccess({ res, data: formatted });
    } catch (error) {
      next(error);
    }
  }

  async uploadOwnerDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, category, size } = req.body;
      const newDoc = await prisma.ownerDocument.create({
        data: {
          name: name || 'Document.pdf',
          category: category || 'Statements',
          size: size || '1.5 MB',
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

  async getOwnerMessages(req: Request, res: Response, next: NextFunction) {
    try {
      let msgs = await prisma.ownerMessage.findMany({
        orderBy: { createdAt: 'desc' },
      });

      if (msgs.length === 0) {
        await prisma.ownerMessage.createMany({
          data: [
            {
              sender: 'Property Manager',
              recipient: 'William Anderson (Owner)',
              subject: 'Q2 Portfolio Performance Update',
              body: 'Hello William, your Q2 property distribution has been processed and transferred successfully.',
            },
            {
              sender: 'Maintenance Lead',
              recipient: 'William Anderson (Owner)',
              subject: 'Highland Heights Inspection Complete',
              body: 'Routine HVAC & roof inspection at Highland Heights Portfolio has been successfully completed.',
            },
          ],
        });

        msgs = await prisma.ownerMessage.findMany({
          orderBy: { createdAt: 'desc' },
        });
      }

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

  async composeOwnerMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { sender, recipient, subject, body } = req.body;
      const newMsg = await prisma.ownerMessage.create({
        data: {
          sender: sender || 'William Anderson (Owner)',
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

  async getOwnerProfile(req: Request, res: Response, next: NextFunction) {
    try {
      let owner = await prisma.owner.findFirst();
      if (!owner) {
        owner = await prisma.owner.create({
          data: {
            firstName: 'William',
            lastName: 'Anderson',
            email: 'bill.a@investments.com',
            phone: '(212) 555-0122',
            streetAddress: '742 Evergreen Terrace, New York, NY',
            payoutMethod: 'ACH/Direct Deposit',
          },
        });
      }

      return sendSuccess({
        res,
        data: {
          id: owner.id,
          firstName: owner.firstName || 'William',
          lastName: owner.lastName || 'Anderson',
          email: owner.email || 'bill.a@investments.com',
          phone: owner.phone || '(212) 555-0122',
          streetAddress: owner.streetAddress || '742 Evergreen Terrace, New York, NY',
          bankName: 'Chase checking',
          accountNumber: 'XXXX-XXXX-9822',
          payoutStatus: 'Verified',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateOwnerProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { firstName, lastName, email, phone, streetAddress, bankName, accountNumber } = req.body;
      let owner = await prisma.owner.findFirst();

      if (!owner) {
        owner = await prisma.owner.create({
          data: {
            firstName: firstName || 'William',
            lastName: lastName || 'Anderson',
            email: email || 'bill.a@investments.com',
            phone: phone || '(212) 555-0122',
            streetAddress: streetAddress || '742 Evergreen Terrace, New York, NY',
          },
        });
      } else {
        owner = await prisma.owner.update({
          where: { id: owner.id },
          data: {
            firstName: firstName || owner.firstName,
            lastName: lastName || owner.lastName,
            email: email || owner.email,
            phone: phone || owner.phone,
            streetAddress: streetAddress || owner.streetAddress,
          },
        });
      }

      return sendSuccess({
        res,
        data: {
          id: owner.id,
          firstName: owner.firstName || 'William',
          lastName: owner.lastName || 'Anderson',
          email: owner.email,
          phone: owner.phone,
          streetAddress: owner.streetAddress,
          bankName: bankName || 'Chase checking',
          accountNumber: accountNumber || 'XXXX-XXXX-9822',
          payoutStatus: 'Verified',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getOwnerReports(req: Request, res: Response, next: NextFunction) {
    try {
      const properties = await prisma.property.findMany();
      let revenue = 0;
      for (const p of properties) {
        revenue += p.currentValue ? Math.round(p.currentValue / 500) : 2400;
      }
      if (revenue === 0) revenue = 24500;

      const expenses = Math.round(revenue * 0.15);
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

  async getOwnerMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const totalProperties = await prisma.property.count();
      const properties = await prisma.property.findMany();

      let monthlyIncome = 0;
      for (const p of properties) {
        monthlyIncome += p.currentValue ? Math.round(p.currentValue / 500) : 2400;
      }
      if (monthlyIncome === 0) monthlyIncome = 24500;

      const monthlyExpenses = Math.round(monthlyIncome * 0.15);
      const netDistribution = monthlyIncome - monthlyExpenses;

      return sendSuccess({
        res,
        data: {
          monthlyIncome,
          monthlyExpenses,
          netDistribution,
          netIncome: netDistribution,
          totalProperties,
          occupancyRate: 94.5,
          totalUnits: totalProperties * 4,
          activeLeases: totalProperties * 3,
          pendingMaintenance: 2,
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
      const { name, firstName, lastName, email, phone, source } = req.body;
      const resolvedName = name || [firstName, lastName].filter(Boolean).join(' ') || 'Unnamed Lead';
      const resolvedSource = source || 'Portal';
      const lead = await prisma.crmLead.create({
        data: { 
          name: resolvedName, 
          email, 
          phone, 
          source: resolvedSource 
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
        include: { tenant: true },
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
          status: status || 'Approved',
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
            .filter((m) => m.sender === 'Property Manager Office' || m.recipient === 'Property Manager Office')
            .map((m) => ({
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
            .filter((m) => m.sender === 'Leasing Office' || m.recipient === 'Leasing Office')
            .map((m) => ({
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
  async getInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const invoices = await prisma.invoice.findMany({
        include: { tenant: true },
        orderBy: { dueDate: 'asc' },
      });
      return sendSuccess({ res, data: invoices });
    } catch (error) {
      next(error);
    }
  }

  async createTenantMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { sender, recipient, subject, body } = req.body;
      const newMsg = await prisma.tenantMessage.create({
        data: {
          sender: sender || 'Alex Mercer (Resident)',
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
  async getCharges(req: Request, res: Response, next: NextFunction) {
    try {
      const charges = await prisma.charge.findMany({
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
  async getDeposits(req: Request, res: Response, next: NextFunction) {
    try {
      const deposits = await prisma.deposit.findMany({
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
      let orders = await prisma.workOrder.findMany({
        where: companyId ? { companyId } : {},
        include: { property: true },
        orderBy: { createdAt: 'desc' },
      });

      const firstProperty = await prisma.property.findFirst({
        where: companyId ? { companyId } : {},
      });
      let propertyId = firstProperty?.id;

      if (!propertyId) {
        const owner = await prisma.owner.findFirst({
          where: companyId ? { companyId } : {},
        });
        const newProp = await prisma.property.create({
          data: {
            name: 'Oakridge Heights',
            address: '100 Main St, Austin, TX 78701',
            streetAddress: '100 Main St',
            city: 'Austin',
            state: 'TX',
            zip: '78701',
            yearBuilt: 2018,
            squareFootage: 12000,
            purchasePrice: 1500000,
            currentValue: 1800000,
            ownerId: owner?.id || 'default-owner',
            companyId,
          },
        });
        propertyId = newProp.id;
      }

      if (orders.length === 0) {
        await prisma.workOrder.createMany({
          data: [
            {
              title: 'HVAC Air Conditioner Filter Replacement',
              description: 'AC unit blowing warm air, filter replacement required.',
              priority: 'High',
              status: 'Open',
              propertyId: propertyId,
              estimatedCost: 180,
            },
            {
              title: 'Plumbing Sink Leak Repair',
              description: 'Kitchen sink pipe leaking continuously.',
              priority: 'Normal',
              status: 'InProgress',
              propertyId: propertyId,
              estimatedCost: 120,
            },
            {
              title: 'Electrical Panel Inspection & Outlet Repair',
              description: 'Master bedroom outlet sparking.',
              priority: 'Emergency',
              status: 'Open',
              propertyId: propertyId,
              estimatedCost: 250,
            },
          ],
        });
      }

      if (!orders.some((o) => ['Completed', 'Closed', 'Rejected'].includes(o.status))) {
        await prisma.workOrder.createMany({
          data: [
            {
              title: 'Water Heater Element Replacement',
              description: 'Replaced faulty heating element and flushed 50 gal tank.',
              priority: 'High',
              status: 'Completed',
              propertyId: propertyId,
              estimatedCost: 350,
              actualCost: 320,
            },
            {
              title: 'Smoke Detector Battery Maintenance',
              description: 'Replaced backup 9V batteries across building hallway sensors.',
              priority: 'Normal',
              status: 'Completed',
              propertyId: propertyId,
              estimatedCost: 80,
              actualCost: 65,
            },
          ],
        });
      }

      orders = await prisma.workOrder.findMany({
        include: { property: true },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = orders.map((wo: any, index: number) => ({
        id: wo.id,
        workOrderNumber: `WO-${1001 + index}`,
        propertyName: wo.property?.name || 'Oakridge Heights',
        unitNumber: 'Unit 402',
        issue: wo.title,
        category: wo.title.toLowerCase().includes('hvac') ? 'HVAC' : wo.title.toLowerCase().includes('plumbing') ? 'Plumbing' : 'Electrical',
        priority: wo.priority === 'Normal' ? 'Medium' : wo.priority || 'Medium',
        status: wo.status === 'Open' ? 'New' : wo.status === 'InProgress' ? 'In Progress' : wo.status === 'Completed' ? 'Completed' : wo.status === 'Closed' ? 'Closed' : wo.status === 'Rejected' ? 'Rejected' : wo.status === 'Assigned' ? 'Assigned' : wo.status || 'New',
        assignedTechnician: 'Technician Lead 1',
        dueDate: '2026-07-30',
        createdAt: wo.createdAt ? new Date(wo.createdAt).toISOString().split('T')[0] : '2026-07-25',
        description: wo.description || '',
        estimatedCost: wo.estimatedCost || 150,
        actualCost: wo.actualCost || 0,
        rejectReason: wo.rejectReason || null,
        resolutionNotes: wo.resolutionNotes || null,
      }));

      return sendSuccess({ res, data: formatted });
    } catch (error) {
      next(error);
    }
  }

  async updateStaffTaskStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status, actualCost, rejectReason, resolutionNotes } = req.body;

      // Map frontend status string → Prisma WorkOrderStatus enum value
      const statusMap: Record<string, string> = {
        'Open': 'Open',
        'New': 'Open',
        'Assigned': 'Assigned',
        'Scheduled': 'Assigned',
        'Draft': 'Open',
        'In Progress': 'InProgress',
        'In_Progress': 'InProgress',
        'InProgress': 'InProgress',
        'Completed': 'Completed',
        'Rejected': 'Rejected',
        'Cancelled': 'Cancelled',
        'Closed': 'Closed',
      };

      const mappedStatus = status ? (statusMap[status] ?? status) : undefined;

      const order = await prisma.workOrder.update({
        where: { id },
        data: {
          ...(mappedStatus && { status: mappedStatus as any }),
          ...(actualCost !== undefined && actualCost !== null && { actualCost: parseFloat(String(actualCost)) }),
          ...(rejectReason && { rejectReason }),
          ...(resolutionNotes && { resolutionNotes }),
        },
      });

      return sendSuccess({ res, data: order });
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
      const expense = await prisma.expense.create({
        data: {
          category,
          amount: parseFloat(amount || '0'),
          date: new Date(date || Date.now()),
          description: description || '',
        },
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
        orderBy: { date: 'asc' },
      });
      return sendSuccess({ res, data: inspections });
    } catch (error) {
      next(error);
    }
  }

  async createInspection(req: Request, res: Response, next: NextFunction) {
    try {
      const { propertyName, unitNumber, inspector, status, date } = req.body;
      const inspection = await prisma.inspection.create({
        data: {
          propertyName,
          unitNumber,
          inspector,
          status: status || 'Scheduled',
          date: date ? new Date(date) : new Date(),
        },
      });
      return sendSuccess({ res, statusCode: 201, data: inspection });
    } catch (error) {
      next(error);
    }
  }

  async updateInspection(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, date, inspector } = req.body;
      const inspection = await prisma.inspection.update({
        where: { id: req.params.id as string },
        data: {
          status,
          date: date ? new Date(date) : undefined,
          inspector,
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
}

export const portalController = new PortalController();
