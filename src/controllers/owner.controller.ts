import { Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import bcrypt from 'bcrypt';
import { getManagerCompanyId } from '../utils/companyHelper.js';

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
      const { name, firstName, lastName, email, phone, payoutMethod, password, propertiesOwned } = req.body;
      const resolvedName = name || `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';
      const companyId = await getManagerCompanyId(req, req.body.companyId || req.user?.companyId);
      const owner = await prisma.owner.create({
        data: {
          name: resolvedName,
          email,
          phone,
          payoutMethod: payoutMethod || 'ACH/Direct Deposit',
          companyId,
        },
      });

      if (Array.isArray(propertiesOwned) && propertiesOwned.length > 0) {
        await prisma.property.updateMany({
          where: { id: { in: propertiesOwned } },
          data: { ownerId: owner.id },
        });
      }

      if (password) {
        let role = await prisma.role.findUnique({
          where: { name: 'Owner' },
        });
        if (!role) {
          role = await prisma.role.findFirst() as any;
        }
        if (role) {
          const passwordHash = await bcrypt.hash(password, 12);
          const [first = '', ...lastParts] = resolvedName.split(' ');
          const last = lastParts.join(' ') || 'Owner';
          await prisma.user.create({
            data: {
              email,
              passwordHash,
              firstName: first || 'Owner',
              lastName: last,
              phone: phone || null,
              roleId: role.id,
              companyId,
            },
          });
        }
      }

      return sendSuccess({ res, statusCode: 201, data: owner });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { name, firstName, lastName, email, phone, payoutMethod, password, propertiesOwned } = req.body;
      const resolvedName = name || `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';
      const companyId = req.user?.companyId;

      const oldOwner = await prisma.owner.findUnique({
        where: { id },
      });

      const owner = await prisma.owner.update({
        where: companyId ? { id, companyId } : { id },
        data: {
          name: resolvedName,
          email,
          phone,
          payoutMethod,
        },
      });

      if (Array.isArray(propertiesOwned)) {
        if (propertiesOwned.length > 0) {
          await prisma.property.updateMany({
            where: { id: { in: propertiesOwned } },
            data: { ownerId: owner.id },
          });
        }
      }

      if (password && oldOwner) {
        const passwordHash = await bcrypt.hash(password, 12);
        const [first = '', ...lastParts] = resolvedName.split(' ');
        const last = lastParts.join(' ') || 'Owner';

        const existingUser = await prisma.user.findFirst({
          where: { email: oldOwner.email },
        });

        if (existingUser) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              email,
              passwordHash,
              firstName: first || 'Owner',
              lastName: last,
              phone,
            },
          });
        } else {
          let role = await prisma.role.findUnique({
            where: { name: 'Owner' },
          });
          if (!role) {
            role = await prisma.role.findFirst() as any;
          }
          if (role) {
            await prisma.user.create({
              data: {
                email,
                passwordHash,
                firstName: first || 'Owner',
                lastName: last,
                phone: phone || null,
                roleId: role.id,
                companyId,
              },
            });
          }
        }
      }

      return sendSuccess({ res, data: owner });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const companyId = req.user?.companyId;

      const ownerExists = await prisma.owner.findFirst({
        where: companyId ? { id, companyId } : { id },
      });
      if (!ownerExists) {
        return res.status(404).json({ success: false, error: 'Owner not found' });
      }

      await prisma.$transaction(async (tx) => {
        // 1. Delete associated owner distributions
        await tx.ownerDistribution.deleteMany({
          where: { ownerId: id },
        });

        // 2. Delete associated owner documents
        await tx.ownerDocument.deleteMany({
          where: { ownerId: id },
        });

        // 3. Delete associated properties
        const properties = await tx.property.findMany({
          where: { ownerId: id },
          select: { id: true },
        });

        for (const prop of properties) {
          await tx.property.delete({
            where: { id: prop.id },
          });
        }

        // 4. Delete the owner record
        await tx.owner.delete({
          where: { id },
        });
      });

      return sendSuccess({ res, message: 'Owner deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const ownerController = new OwnerController();
