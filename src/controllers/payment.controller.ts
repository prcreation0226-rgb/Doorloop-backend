import { Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AppError } from '../utils/appError';
import prisma from '../config/database';

export class PaymentController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const payments = await paymentService.getAllPayments(companyId, req.user);
      return sendSuccess({ res, data: payments });
    } catch (error) {
      next(error);
    }
  }

  async processPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const { tenantId, propertyId, unitId, leaseId, invoiceId } = req.body;

      if (companyId) {
        if (tenantId) {
          const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, companyId } });
          if (!tenant) throw new AppError('Tenant not found.', 404, 'NOT_FOUND');
        }
        if (propertyId) {
          const prop = await prisma.property.findFirst({ where: { id: propertyId, companyId } });
          if (!prop) throw new AppError('Property not found.', 404, 'NOT_FOUND');
        }
        if (unitId) {
          const unit = await prisma.unit.findFirst({ where: { id: unitId, property: { companyId } } });
          if (!unit) throw new AppError('Unit not found.', 404, 'NOT_FOUND');
        }
        if (leaseId) {
          const lease = await prisma.lease.findFirst({ where: { id: leaseId, companyId } });
          if (!lease) throw new AppError('Lease not found.', 404, 'NOT_FOUND');
        }
        if (invoiceId) {
          const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId } });
          if (!invoice) throw new AppError('Invoice not found.', 404, 'NOT_FOUND');
        }
      }

      const payment = await paymentService.processPayment({
        ...req.body,
        companyId,
        userEmail: req.user?.email,
        userRole: req.user?.roleName || (req.user as any)?.role,
      });
      return sendSuccess({ res, statusCode: 201, data: payment });
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
