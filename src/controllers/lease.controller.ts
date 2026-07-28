import { Response, NextFunction } from 'express';
import { leaseService } from '../services/lease.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class LeaseController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const leases = await leaseService.getAllLeases(companyId);
      return sendSuccess({ res, data: leases });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const lease = await leaseService.createLease({ ...req.body, companyId });
      return sendSuccess({ res, statusCode: 201, data: lease });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const lease = await leaseService.updateLease(req.params.id as string, req.body, companyId);
      return sendSuccess({ res, data: lease });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      await leaseService.deleteLease(req.params.id as string, companyId);
      return sendSuccess({ res, data: { success: true } });
    } catch (error) {
      next(error);
    }
  }
}

export const leaseController = new LeaseController();
