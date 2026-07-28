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
      const { firstName, lastName, email, phone, payoutMethod } = req.body;
      const companyId = req.user?.companyId;
      const owner = await prisma.owner.create({
        data: {
          firstName,
          lastName,
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
}

export const ownerController = new OwnerController();
