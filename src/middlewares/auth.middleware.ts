import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.js';
import { AppError } from '../utils/appError.js';
import { tenantContext } from '../utils/tenantContext.js';
import prisma from '../config/database.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;

    const userRole = payload.roleName;
    let tenantId: string | undefined;
    let ownerId: string | undefined;
    let staffId: string | undefined;

    if (userRole === 'Tenant') {
      const tenant = await prisma.tenant.findFirst({ where: { email: payload.email } });
      tenantId = tenant?.id;
    } else if (userRole === 'Owner') {
      const owner = await prisma.owner.findFirst({ where: { email: payload.email } });
      ownerId = owner?.id;
    } else if (userRole === 'Maintenance Staff') {
      const staff = await prisma.staffProfile.findFirst({ where: { email: payload.email } });
      staffId = staff?.id;
    }

    tenantContext.run({
      userId: payload.userId,
      userName: payload.email,
      companyId: payload.companyId || '',
      role: payload.roleName || '',
      tenantId,
      ownerId,
      staffId
    }, () => {
      next();
    });
  } catch (error) {
    return next(new AppError('Invalid or expired access token.', 401, 'TOKEN_EXPIRED'));
  }
}
