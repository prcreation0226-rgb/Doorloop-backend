import { Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class OwnerController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const owners = await prisma.owner.findMany({
        where: companyId ? { companyId } : {},
        include: {
          properties: true,
        },
      });
      return sendSuccess({ res, data: owners });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { name, firstName, lastName, email, phone, payoutMethod } = req.body;
      const resolvedName = name || `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';
      const companyId = req.user?.companyId;
      const owner = await prisma.owner.create({
        data: {
          name: resolvedName,
          email,
          phone,
          payoutMethod: payoutMethod || 'ACH/Direct Deposit',
          companyId,
        },
      });
      return sendSuccess({ res, statusCode: 201, data: owner });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { name, firstName, lastName, email, phone, payoutMethod } = req.body;
      const resolvedName = name || `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';
      const companyId = req.user?.companyId;

      const owner = await prisma.owner.update({
        where: companyId ? { id, companyId } : { id },
        data: {
          name: resolvedName,
          email,
          phone,
          payoutMethod,
        },
      });
      return sendSuccess({ res, data: owner });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const companyId = req.user?.companyId;

      await prisma.owner.delete({
        where: companyId ? { id, companyId } : { id },
      });
      return sendSuccess({ res, message: 'Owner deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const ownerController = new OwnerController();
