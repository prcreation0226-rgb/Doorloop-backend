import { Response, NextFunction } from 'express';
import { moveOutService } from '../services/moveOut.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class MoveOutController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const status = req.query.status as string;
      const moveOuts = await moveOutService.getAllMoveOuts(companyId, status);
      return sendSuccess({ res, data: moveOuts });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const moveOut = await moveOutService.getMoveOutById(req.params.id as string, companyId);
      if (!moveOut) return res.status(404).json({ error: 'Move Out record not found' });
      return sendSuccess({ res, data: moveOut });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const moveOut = await moveOutService.createMoveOut({
        ...req.body,
        companyId,
        createdBy: req.user?.email || 'System',
      });
      return sendSuccess({ res, statusCode: 201, data: moveOut });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const moveOut = await moveOutService.updateMoveOut(req.params.id as string, {
        ...req.body,
        userId: req.user?.userId,
      }, companyId);
      return sendSuccess({ res, data: moveOut });
    } catch (error) {
      next(error);
    }
  }

  async startInspection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const inspection = await moveOutService.startInspection(
        req.params.id as string,
        req.body.templateId,
        req.user?.userId || 'System',
        companyId
      );
      return sendSuccess({ res, statusCode: 201, data: inspection });
    } catch (error) {
      next(error);
    }
  }

  async reviewDamage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const moveOut = await moveOutService.submitDamageReview(
        req.params.id as string,
        req.body.items,
        req.user?.userId || 'System',
        companyId
      );
      return sendSuccess({ res, data: moveOut });
    } catch (error) {
      next(error);
    }
  }

  async saveDepositSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const summary = await moveOutService.saveDepositSummary(
        req.params.id as string,
        req.body
      );
      return sendSuccess({ res, data: summary });
    } catch (error) {
      next(error);
    }
  }

  async completeMoveOut(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const moveOut = await moveOutService.completeMoveOut(req.params.id as string, req.user?.userId, companyId);
      return sendSuccess({ res, data: moveOut });
    } catch (error) {
      next(error);
    }
  }

  async cancelMoveOut(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const moveOut = await moveOutService.cancelMoveOut(
        req.params.id as string,
        req.body.reason,
        req.user?.userId,
        companyId
      );
      return sendSuccess({ res, data: moveOut });
    } catch (error) {
      next(error);
    }
  }
}

export const moveOutController = new MoveOutController();
