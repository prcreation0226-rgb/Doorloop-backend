import { Response, NextFunction } from 'express';
import { inspectionService } from '../services/inspection.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class InspectionController {
  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const inspection = await inspectionService.getInspectionById(req.params.id as string, companyId);
      if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
      return sendSuccess({ res, data: inspection });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const inspection = await inspectionService.updateInspectionDraft(
        req.params.id as string,
        {
          ...req.body,
          userId: req.user?.userId,
        },
        companyId
      );
      return sendSuccess({ res, data: inspection });
    } catch (error) {
      next(error);
    }
  }

  async complete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const inspection = await inspectionService.completeInspection(req.params.id as string, req.user?.userId, companyId);
      return sendSuccess({ res, data: inspection });
    } catch (error) {
      next(error);
    }
  }

  async reopen(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const inspection = await inspectionService.reopenInspection(req.params.id as string, req.user?.userId, companyId);
      return sendSuccess({ res, data: inspection });
    } catch (error) {
      next(error);
    }
  }

  async getInspectors(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const inspectors = await inspectionService.getInspectors(companyId);
      return sendSuccess({ res, data: inspectors });
    } catch (error) {
      next(error);
    }
  }
}

export const inspectionController = new InspectionController();
