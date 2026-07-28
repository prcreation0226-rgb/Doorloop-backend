import { Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { AppError } from '../utils/appError.js';

export class TenantController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const tenants = await prisma.tenant.findMany({
        where: companyId ? { companyId } : {},
        include: {
          unit: {
            include: {
              property: true,
            },
          },
          leases: true,
        },
      });
      return sendSuccess({ res, data: tenants });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { firstName, lastName, email, phone, unitId, status } = req.body;
      const companyId = req.user?.companyId;
      const tenant = await prisma.tenant.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          unitId,
          status: status || 'Pending',
          companyId,
        },
      });
      return sendSuccess({ res, statusCode: 201, data: tenant });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const tenant = await prisma.tenant.findFirst({
        where: companyId ? { id: req.params.id as string, companyId } : { id: req.params.id as string },
        include: {
          unit: {
            include: {
              property: true,
            },
          },
          leases: true,
        },
      });
      if (!tenant) throw new AppError('Tenant not found.', 404, 'NOT_FOUND');
      return sendSuccess({ res, data: tenant });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { firstName, lastName, email, phone, unitId, status } = req.body;
      const companyId = req.user?.companyId;
      if (companyId) {
        const tenant = await prisma.tenant.findFirst({
          where: { id: req.params.id as string, companyId },
        });
        if (!tenant) throw new AppError('Tenant not found.', 404, 'NOT_FOUND');
      }
      const tenant = await prisma.tenant.update({
        where: { id: req.params.id as string },
        data: { firstName, lastName, email, phone, unitId, status },
      });
      return sendSuccess({ res, data: tenant });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      if (companyId) {
        const tenant = await prisma.tenant.findFirst({
          where: { id: req.params.id as string, companyId },
        });
        if (!tenant) throw new AppError('Tenant not found.', 404, 'NOT_FOUND');
      }
      await prisma.tenant.delete({
        where: { id: req.params.id as string },
      });
      return sendSuccess({ res, data: { success: true } });
    } catch (error) {
      next(error);
    }
  }
}

export const tenantController = new TenantController();
