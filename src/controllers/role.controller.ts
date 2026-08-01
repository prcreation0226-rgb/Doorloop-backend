import { Response, NextFunction } from 'express';
import { roleService } from '../services/role.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class RoleController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId || '';
      const roles = await roleService.getAllRoles(companyId);
      return sendSuccess({ res, data: roles });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId || '';
      const role = await roleService.createRole(companyId, req.body);
      return sendSuccess({ res, statusCode: 201, data: role });
    } catch (error) {
      next(error);
    }
  }

  async clone(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId || '';
      const role = await roleService.cloneRole(req.params.id as string, companyId, req.body.name);
      return sendSuccess({ res, data: role });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId || '';
      const role = await roleService.updateRolePermissions(req.params.id as string, companyId, req.body);
      return sendSuccess({ res, data: role });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId || '';
      await roleService.deleteRole(req.params.id as string, companyId);
      return sendSuccess({ res, data: { success: true } });
    } catch (error) {
      next(error);
    }
  }
}

export const roleController = new RoleController();
