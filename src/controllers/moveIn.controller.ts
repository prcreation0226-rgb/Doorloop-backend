import { Response, NextFunction } from 'express';
import { moveInService } from '../services/moveIn.service';
import { inspectionService } from '../services/inspection.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class MoveInController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const status = req.query.status as string;
      const moveIns = await moveInService.getAllMoveIns(companyId, status);
      return sendSuccess({ res, data: moveIns });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const moveIn = await moveInService.getMoveInById(req.params.id as string, companyId);
      if (!moveIn) return res.status(404).json({ error: 'Move In record not found' });
      return sendSuccess({ res, data: moveIn });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const moveIn = await moveInService.createMoveIn({
        ...req.body,
        companyId,
        createdBy: req.user?.email || 'System',
      });
      return sendSuccess({ res, statusCode: 201, data: moveIn });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const moveIn = await moveInService.updateMoveIn(req.params.id as string, {
        ...req.body,
        userId: req.user?.userId,
      }, companyId);
      return sendSuccess({ res, data: moveIn });
    } catch (error) {
      next(error);
    }
  }

  async startInspection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const inspection = await inspectionService.startInspection({
        moveInId: req.params.id as string,
        templateId: req.body.templateId,
        createdBy: req.user?.email || 'System',
        userId: req.user?.userId,
        companyId,
      });
      return sendSuccess({ res, statusCode: 201, data: inspection });
    } catch (error) {
      next(error);
    }
  }

  async completeMoveIn(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const moveIn = await moveInService.completeMoveIn(req.params.id as string, req.user?.userId, companyId);
      return sendSuccess({ res, data: moveIn });
    } catch (error) {
      next(error);
    }
  }
}

export const moveInController = new MoveInController();
