import { Response, NextFunction } from 'express';
import { propertyService } from '../services/property.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class PropertyController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const properties = await propertyService.getAllProperties(companyId);
      return sendSuccess({ res, data: properties });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const companyId = req.user?.companyId;
      const property = await propertyService.getPropertyById(id, companyId);
      return sendSuccess({ res, data: property });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const newProp = await propertyService.createProperty({ ...req.body, companyId });
      return sendSuccess({ res, statusCode: 201, data: newProp });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const companyId = req.user?.companyId;
      await propertyService.deleteProperty(id, companyId);
      return sendSuccess({ res, message: 'Property deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const propertyController = new PropertyController();
