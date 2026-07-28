import { Request, Response, NextFunction } from 'express';
import { superAdminService } from '../services/superadmin.service';
import { sendSuccess } from '../utils/apiResponse';

export class SuperAdminController {
  // Companies
  async getCompanies(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await superAdminService.getCompanies();
      return sendSuccess({ res, data: list });
    } catch (error) {
      next(error);
    }
  }

  async getCompanyById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const company = await superAdminService.getCompanyById(id);
      return sendSuccess({ res, data: company });
    } catch (error) {
      next(error);
    }
  }

  async createCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const company = await superAdminService.createCompany(req.body);
      return sendSuccess({ res, statusCode: 201, data: company });
    } catch (error) {
      next(error);
    }
  }

  async updateCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const company = await superAdminService.updateCompany(id, req.body);
      return sendSuccess({ res, data: company });
    } catch (error) {
      next(error);
    }
  }

  async deleteCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await superAdminService.deleteCompany(id);
      return sendSuccess({ res, message: 'Company deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Company Users
  async getCompanyUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await superAdminService.getCompanyUsers();
      return sendSuccess({ res, data: list });
    } catch (error) {
      next(error);
    }
  }

  async createCompanyUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await superAdminService.createCompanyUser(req.body);
      return sendSuccess({ res, statusCode: 201, data: user });
    } catch (error) {
      next(error);
    }
  }

  async updateCompanyUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const user = await superAdminService.updateCompanyUserStatus(id, req.body.status);
      return sendSuccess({ res, data: user });
    } catch (error) {
      next(error);
    }
  }

  async deleteCompanyUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await superAdminService.deleteCompanyUser(id);
      return sendSuccess({ res, message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Plans
  async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await superAdminService.getPlans();
      return sendSuccess({ res, data: list });
    } catch (error) {
      next(error);
    }
  }

  async createPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = await superAdminService.createPlan(req.body);
      return sendSuccess({ res, statusCode: 201, data: plan });
    } catch (error) {
      next(error);
    }
  }

  // Invoices
  async getInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await superAdminService.getInvoices();
      return sendSuccess({ res, data: list });
    } catch (error) {
      next(error);
    }
  }

  async createInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await superAdminService.createInvoice(req.body);
      return sendSuccess({ res, statusCode: 201, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  async updateInvoiceStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const invoice = await superAdminService.updateInvoiceStatus(id, req.body.status);
      return sendSuccess({ res, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  // Stats
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await superAdminService.getStats();
      return sendSuccess({ res, data: stats });
    } catch (error) {
      next(error);
    }
  }

  // Settings
  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await superAdminService.getPlatformSettings();
      return sendSuccess({ res, data: settings });
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await superAdminService.updatePlatformSettings(req.body);
      return sendSuccess({ res, data: settings });
    } catch (error) {
      next(error);
    }
  }

  // Audit Logs
  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await superAdminService.getAuditLogs();
      return sendSuccess({ res, data: logs });
    } catch (error) {
      next(error);
    }
  }

  async createAuditLog(req: Request, res: Response, next: NextFunction) {
    try {
      const log = await superAdminService.createAuditLog(req.body);
      return sendSuccess({ res, statusCode: 201, data: log });
    } catch (error) {
      next(error);
    }
  }
}

export const superAdminController = new SuperAdminController();
