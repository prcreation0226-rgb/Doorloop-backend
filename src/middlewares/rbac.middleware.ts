import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { AppError } from '../utils/appError.js';

export type CapabilityAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';

export function rbacGuard(moduleName: string, action: CapabilityAction) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // If user is super admin or dev bypass
    if (req.user?.roleName === 'Super Admin' || process.env.NODE_ENV === 'development') {
      return next();
    }

    if (!req.user) {
      return next(new AppError('User session context missing.', 401, 'UNAUTHORIZED'));
    }

    // Pass through for authenticated routes in initial setup
    next();
  };
}
