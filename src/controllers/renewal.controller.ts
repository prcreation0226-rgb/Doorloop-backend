import { Response, NextFunction } from 'express';
import { renewalService } from '../services/renewal.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class RenewalController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const renewals = await renewalService.getAllRenewals(companyId);
      return sendSuccess({ res, data: renewals });
    } catch (error) {
      next(error);
    }
  }

  async sendOffer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { leaseId } = req.body;
      if (!leaseId) return res.status(400).json({ error: 'leaseId is required' });
      const result = await renewalService.sendOffer(leaseId);
      return sendSuccess({ res, data: result });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { leaseId, newRentAmount, termMonths, newEndDate } = req.body;
      if (!leaseId) return res.status(400).json({ error: 'leaseId is required' });
      const result = await renewalService.updateRenewal(leaseId, { newRentAmount, termMonths, newEndDate });
      return sendSuccess({ res, data: result });
    } catch (error) {
      next(error);
    }
  }

  async accept(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { leaseId, termMonths } = req.body;
      if (!leaseId) return res.status(400).json({ error: 'leaseId is required' });
      const companyId = req.user?.companyId;
      const result = await renewalService.acceptRenewal(leaseId, companyId, termMonths);
      return sendSuccess({ res, data: result });
    } catch (error) {
      next(error);
    }
  }

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { leaseId } = req.body;
      if (!leaseId) return res.status(400).json({ error: 'leaseId is required' });
      const companyId = req.user?.companyId;
      const result = await renewalService.rejectRenewal(leaseId, companyId);
      return sendSuccess({ res, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const renewalController = new RenewalController();
