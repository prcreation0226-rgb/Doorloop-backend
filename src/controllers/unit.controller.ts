import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class UnitController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const units = await prisma.unit.findMany({
        where: companyId ? {
          property: {
            companyId: companyId
          }
        } : {},
        include: {
          property: true,
          building: true,
          tenants: true,
        },
      });
      return sendSuccess({ res, data: units });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const companyId = req.user?.companyId;
      const unit = await prisma.unit.findFirst({
        where: companyId ? {
          id,
          property: { companyId },
        } : { id },
        include: {
          property: true,
          building: true,
          tenants: true,
        },
      });
      return sendSuccess({ res, data: unit });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const {
        propertyId,
        buildingId,
        unitNumber,
        floor,
        bedrooms,
        bathrooms,
        squareFootage,
        rentAmount,
        securityDeposit,
        availabilityDate,
        status,
      } = req.body;
      const companyId = req.user?.companyId;

      if (companyId) {
        const check = await prisma.property.findFirst({
          where: { id: propertyId, companyId },
        });
        if (!check) throw new Error('Unauthorized property reference.');
      }

      const unit = await prisma.unit.create({
        data: {
          propertyId,
          buildingId,
          unitNumber,
          floor: parseInt(floor || '1'),
          bedrooms: parseInt(bedrooms || '1'),
          bathrooms: parseFloat(bathrooms || '1.0'),
          squareFootage: parseFloat(squareFootage || '0'),
          rentAmount: parseFloat(rentAmount || '0'),
          securityDeposit: parseFloat(securityDeposit || '0'),
          availabilityDate: new Date(availabilityDate || Date.now()),
          status: status || 'Vacant',
        },
      });
      return sendSuccess({ res, statusCode: 201, data: unit });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const companyId = req.user?.companyId;
      const {
        propertyId,
        buildingId,
        unitNumber,
        floor,
        bedrooms,
        bathrooms,
        squareFootage,
        rentAmount,
        securityDeposit,
        availabilityDate,
        status,
      } = req.body;

      if (companyId) {
        const check = await prisma.unit.findFirst({
          where: {
            id,
            property: { companyId },
          },
        });
        if (!check) throw new Error('Unit not found.');
      }

      const unit = await prisma.unit.update({
        where: { id },
        data: {
          propertyId,
          buildingId,
          unitNumber,
          floor: floor !== undefined ? parseInt(floor) : undefined,
          bedrooms: bedrooms !== undefined ? parseInt(bedrooms) : undefined,
          bathrooms: bathrooms !== undefined ? parseFloat(bathrooms) : undefined,
          squareFootage: squareFootage !== undefined ? parseFloat(squareFootage) : undefined,
          rentAmount: rentAmount !== undefined ? parseFloat(rentAmount) : undefined,
          securityDeposit: securityDeposit !== undefined ? parseFloat(securityDeposit) : undefined,
          availabilityDate: availabilityDate ? new Date(availabilityDate) : undefined,
          status,
        },
      });
      return sendSuccess({ res, data: unit });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const companyId = req.user?.companyId;

      if (companyId) {
        const check = await prisma.unit.findFirst({
          where: {
            id,
            property: { companyId },
          },
        });
        if (!check) throw new Error('Unit not found.');
      }

      await prisma.unit.delete({
        where: { id },
      });
      return sendSuccess({ res, data: { success: true } });
    } catch (error) {
      next(error);
    }
  }

  async assignTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const companyId = req.user?.companyId;
      const { tenantId } = req.body;

      if (companyId) {
        const check = await prisma.unit.findFirst({
          where: {
            id,
            property: { companyId },
          },
        });
        if (!check) throw new Error('Unit not found.');
      }

      const unit = await prisma.unit.update({
        where: { id },
        data: {
          status: 'Occupied',
          tenants: {
            connect: { id: tenantId },
          },
        },
      });
      return sendSuccess({ res, data: unit });
    } catch (error) {
      next(error);
    }
  }
}

export const unitController = new UnitController();
