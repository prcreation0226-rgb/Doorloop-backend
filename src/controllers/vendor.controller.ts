import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import bcrypt from 'bcrypt';

export class VendorController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const vendors = await prisma.vendor.findMany({
        where: companyId ? { companyId } : {},
        include: {
          workOrders: true,
        },
      });
      return sendSuccess({ res, data: vendors });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { companyName, contactName, email, phone, serviceType, rating, password } = req.body;
      const companyId = req.user?.companyId;
      
      const vendor = await prisma.vendor.create({
        data: {
          companyName,
          contactName,
          email,
          phone,
          serviceType,
          rating: rating || 5.0,
          companyId,
        },
      });

      // Automatically create matching login user for this vendor (Maintenance Staff role)
      if (email) {
        const roleObj = await prisma.role.findFirst({
          where: { name: 'Maintenance Staff' },
        });

        if (roleObj) {
          const existingUser = await prisma.user.findUnique({
            where: { email },
          });

          if (!existingUser) {
            const passwordHash = await bcrypt.hash(password || 'vendor123', 12);
            const nameParts = (contactName || companyName || 'Vendor').trim().split(/\s+/);
            const firstName = nameParts[0] || 'Vendor';
            const lastName = nameParts.slice(1).join(' ') || 'Partner';

            await prisma.user.create({
              data: {
                email,
                passwordHash,
                firstName,
                lastName,
                phone: phone || '',
                roleId: roleObj.id,
              },
            });
          }
        }
      }
      return sendSuccess({ res, statusCode: 201, data: vendor });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { companyName, contactName, email, phone, serviceType, rating } = req.body;
      const id = req.params.id as string;
      const companyId = req.user?.companyId;

      if (companyId) {
        const check = await prisma.vendor.findFirst({
          where: { id, companyId },
        });
        if (!check) throw new Error('Vendor not found.');
      }

      const vendor = await prisma.vendor.update({
        where: { id },
        data: { companyName, contactName, email, phone, serviceType, rating },
      });
      return sendSuccess({ res, data: vendor });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const companyId = req.user?.companyId;

      if (companyId) {
        const check = await prisma.vendor.findFirst({
          where: { id, companyId },
        });
        if (!check) throw new Error('Vendor not found.');
      }

      await prisma.vendor.delete({
        where: { id },
      });
      return sendSuccess({ res, data: { success: true } });
    } catch (error) {
      next(error);
    }
  }
}

export const vendorController = new VendorController();
