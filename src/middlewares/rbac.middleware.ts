import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { AppError } from '../utils/appError.js';
import prisma from '../config/database.js';

export type CapabilityAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';

export function rbacGuard(moduleName: string, action: CapabilityAction) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError('User session context missing.', 401, 'UNAUTHORIZED'));
      }

      // Bypass checks for Super Admin
      if (req.user.roleName === 'Super Admin') {
        return next();
      }

      const roleId = req.user.roleId;
      if (!roleId) {
        // Tenants, Owners and Maintenance staff do not use RBAC roles table, so they bypass this guard
        return next();
      }

      // Query permission matrix for this role and module
      const permission = await prisma.permission.findFirst({
        where: {
          roleId,
          module: moduleName
        }
      });

      if (!permission) {
        return next(new AppError(`Access denied. Permissions not configured for the ${moduleName} module.`, 403, 'FORBIDDEN'));
      }

      let hasAccess = false;
      switch (action) {
        case 'view':
          hasAccess = permission.canView;
          break;
        case 'create':
          hasAccess = permission.canCreate;
          break;
        case 'edit':
          hasAccess = permission.canEdit;
          break;
        case 'delete':
          hasAccess = permission.canDelete;
          break;
        case 'approve':
          hasAccess = permission.canApprove;
          break;
        case 'export':
          hasAccess = permission.canExport;
          break;
        default:
          hasAccess = false;
      }

      if (!hasAccess) {
        return next(new AppError(`Permission denied. You are not authorized to ${action} in the ${moduleName} module.`, 403, 'FORBIDDEN'));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
