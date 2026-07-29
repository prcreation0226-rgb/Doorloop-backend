import { Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { AppError } from '../utils/appError.js';
import bcrypt from 'bcrypt';
import cloudinary from '../config/cloudinary.js';
import { getManagerCompanyId } from '../utils/companyHelper.js';

export class TenantController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const tenants = await prisma.tenant.findMany({
        where: companyId ? { companyId } : {},
        include: {
          unit: {
            include: {
              property: true,
            },
          },
        },
      });
      return sendSuccess({ res, data: tenants });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { firstName, lastName, email, phone, unitId, status, password } = req.body;
      const companyId = await getManagerCompanyId(req, req.body.companyId || req.user?.companyId);
      const file = req.file;

      let imageUrl = null;
      if (file) {
        try {
          imageUrl = await new Promise<string>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { folder: 'talent' },
              (error, result) => {
                if (error) return reject(error);
                resolve(result?.secure_url || '');
              }
            );
            uploadStream.end(file.buffer);
          });
        } catch (err) {
          console.error('Cloudinary tenant photo upload failed:', err);
        }
      }

      const tenant = await prisma.tenant.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          unitId,
          status: status || 'Pending',
          imageUrl,
          companyId,
        },
      });

      if (password) {
        let role = await prisma.role.findUnique({
          where: { name: 'Tenant' },
        });
        if (!role) {
          role = await prisma.role.findFirst() as any;
        }
        if (role) {
          const passwordHash = await bcrypt.hash(password, 12);
          await prisma.user.create({
            data: {
              email,
              passwordHash,
              firstName: firstName || 'Tenant',
              lastName: lastName || 'User',
              phone: phone || null,
              roleId: role.id,
              companyId,
            },
          });
        }
      }

      return sendSuccess({ res, statusCode: 201, data: tenant });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const tenant = await prisma.tenant.findFirst({
        where: companyId ? { id: req.params.id as string, companyId } : { id: req.params.id as string },
        include: {
          unit: {
            include: {
              property: true,
            },
          },
          leases: true,
        },
      });
      if (!tenant) throw new AppError('Tenant not found.', 404, 'NOT_FOUND');
      return sendSuccess({ res, data: tenant });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { firstName, lastName, email, phone, unitId, status, password } = req.body;
      const companyId = req.user?.companyId;
      const id = req.params.id as string;
      const file = req.file;

      const oldTenant = await prisma.tenant.findUnique({
        where: { id },
      });
      if (!oldTenant) throw new AppError('Tenant not found.', 404, 'NOT_FOUND');

      let imageUrl = oldTenant.imageUrl;
      if (file) {
        try {
          imageUrl = await new Promise<string>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { folder: 'talent' },
              (error, result) => {
                if (error) return reject(error);
                resolve(result?.secure_url || '');
              }
            );
            uploadStream.end(file.buffer);
          });
        } catch (err) {
          console.error('Cloudinary tenant photo upload failed:', err);
        }
      }

      const tenant = await prisma.tenant.update({
        where: { id },
        data: {
          firstName,
          lastName,
          email,
          phone,
          unitId,
          status,
          imageUrl,
        },
      });

      if (password) {
        const passwordHash = await bcrypt.hash(password, 12);
        const existingUser = await prisma.user.findFirst({
          where: { email: oldTenant.email },
        });

        if (existingUser) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              email,
              passwordHash,
              firstName: firstName || undefined,
              lastName: lastName || undefined,
              phone,
            },
          });
        } else {
          let role = await prisma.role.findUnique({
            where: { name: 'Tenant' },
          });
          if (!role) {
            role = await prisma.role.findFirst() as any;
          }
          if (role) {
            await prisma.user.create({
              data: {
                email,
                passwordHash,
                firstName: firstName || 'Tenant',
                lastName: lastName || 'User',
                phone: phone || null,
                roleId: role.id,
                companyId,
              },
            });
          }
        }
      }

      return sendSuccess({ res, data: tenant });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      if (companyId) {
        const tenant = await prisma.tenant.findFirst({
          where: { id: req.params.id as string, companyId },
        });
        if (!tenant) throw new AppError('Tenant not found.', 404, 'NOT_FOUND');
      }
      await prisma.tenant.delete({
        where: { id: req.params.id as string },
      });
      return sendSuccess({ res, data: { success: true } });
    } catch (error) {
      next(error);
    }
  }
}

export const tenantController = new TenantController();
