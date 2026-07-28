import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

class InvoiceController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      let invoices = await prisma.invoice.findMany({
        where: companyId ? { companyId } : {},
        orderBy: { createdAt: 'desc' },
      });

      // Seed sample invoices if DB is empty for this company
      if (invoices.length === 0) {
        const tenant = await prisma.tenant.findFirst({
          where: companyId ? { companyId } : {},
        });
        const property = await prisma.property.findFirst({
          where: companyId ? { companyId } : {},
        });

        const tenantName = tenant
          ? `${tenant.firstName} ${tenant.lastName}`
          : 'Alex Johnson';
        const tenantId = tenant?.id || 'default-tenant';
        const propertyName = property?.name || 'Sunset Villas';
        const propertyId = property?.id || 'default-property';

        const seeds = [
          {
            tenantId,
            tenantName,
            propertyId,
            propertyName,
            unitNumber: '101',
            dueDate: '2026-08-01',
            amount: 1800,
            paidAmount: 1800,
            balance: 0,
            status: 'Paid',
            lineItems: JSON.stringify([
              { description: 'Monthly Rent – July 2026', amount: 1650 },
              { description: 'Water & Sewage Utility', amount: 150 },
            ]),
            notes: 'Paid in full on July 1st.',
            companyId,
          },
          {
            tenantId,
            tenantName,
            propertyId,
            propertyName,
            unitNumber: '102',
            dueDate: '2026-08-01',
            amount: 2200,
            paidAmount: 0,
            balance: 2200,
            status: 'Sent',
            lineItems: JSON.stringify([
              { description: 'Monthly Rent – August 2026', amount: 2000 },
              { description: 'Parking Fee', amount: 200 },
            ]),
            notes: null,
            companyId,
          },
          {
            tenantId,
            tenantName,
            propertyId,
            propertyName,
            unitNumber: '203',
            dueDate: '2026-07-15',
            amount: 1500,
            paidAmount: 750,
            balance: 750,
            status: 'Partially Paid',
            lineItems: JSON.stringify([
              { description: 'Monthly Rent – July 2026', amount: 1350 },
              { description: 'Late Fee', amount: 150 },
            ]),
            notes: 'Partial payment received July 10th.',
            companyId,
          },
          {
            tenantId,
            tenantName,
            propertyId,
            propertyName,
            unitNumber: '305',
            dueDate: '2026-07-01',
            amount: 1950,
            paidAmount: 0,
            balance: 1950,
            status: 'Overdue',
            lineItems: JSON.stringify([
              { description: 'Monthly Rent – June 2026', amount: 1800 },
              { description: 'Late Fee', amount: 150 },
            ]),
            notes: 'Tenant contacted 3 times. No response.',
            companyId,
          },
          {
            tenantId,
            tenantName,
            propertyId,
            propertyName,
            unitNumber: '401',
            dueDate: '2026-09-01',
            amount: 2400,
            paidAmount: 0,
            balance: 2400,
            status: 'Draft',
            lineItems: JSON.stringify([
              { description: 'Monthly Rent – September 2026', amount: 2200 },
              { description: 'Water & Sewage Utility', amount: 200 },
            ]),
            notes: null,
            companyId,
          },
        ];

        await prisma.invoice.createMany({ data: seeds });
        invoices = await prisma.invoice.findMany({
          where: companyId ? { companyId } : {},
          orderBy: { createdAt: 'desc' },
        });
      }

      const formatted = invoices.map((inv) => ({
        ...inv,
        lineItems: (() => {
          try { return JSON.parse(inv.lineItems as string); } catch { return []; }
        })(),
      }));

      return sendSuccess({ res, data: formatted });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const {
        tenantId, tenantName, propertyId, propertyName,
        unitNumber, dueDate, amount, paidAmount, balance,
        status, lineItems, notes,
      } = req.body;
      const companyId = req.user?.companyId;

      const invoice = await prisma.invoice.create({
        data: {
          tenantId: tenantId || 'default',
          tenantName: tenantName || 'Unknown Tenant',
          propertyId: propertyId || 'default',
          propertyName: propertyName || 'Unknown Property',
          unitNumber: unitNumber || '',
          dueDate: dueDate || new Date().toISOString().split('T')[0],
          amount: parseFloat(amount) || 0,
          paidAmount: parseFloat(paidAmount) || 0,
          balance: parseFloat(balance ?? amount) || 0,
          status: status || 'Draft',
          lineItems: JSON.stringify(lineItems || []),
          notes: notes || null,
          companyId,
        },
      });

      return sendSuccess({
        res,
        statusCode: 201,
        data: { ...invoice, lineItems: lineItems || [] },
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status, paidAmount, balance, notes } = req.body;
      const companyId = req.user?.companyId;

      if (companyId) {
        const check = await prisma.invoice.findFirst({
          where: { id, companyId },
        });
        if (!check) throw new Error('Invoice not found.');
      }

      const invoice = await prisma.invoice.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(paidAmount !== undefined && { paidAmount: parseFloat(paidAmount) }),
          ...(balance !== undefined && { balance: parseFloat(balance) }),
          ...(notes !== undefined && { notes }),
        },
      });

      return sendSuccess({
        res,
        data: {
          ...invoice,
          lineItems: (() => {
            try { return JSON.parse(invoice.lineItems as string); } catch { return []; }
          })(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const companyId = req.user?.companyId;

      if (companyId) {
        const check = await prisma.invoice.findFirst({
          where: { id, companyId },
        });
        if (!check) throw new Error('Invoice not found.');
      }

      await prisma.invoice.delete({ where: { id } });
      return sendSuccess({ res, data: { deleted: true } });
    } catch (error) {
      next(error);
    }
  }
}

export const invoiceController = new InvoiceController();
