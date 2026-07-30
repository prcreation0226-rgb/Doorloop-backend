import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/report.service';
import { exportService } from '../utils/export.service';
import prisma from '../../config/database';

export class ReportController {
  // Utility helper for logging report audit actions
  private async logAudit(req: Request, action: string, reportName: string, status: string = 'Success') {
    try {
      const user = (req as any).user;
      if (!user) return;

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action,
          module: 'Reports',
          object: reportName,
          ip: req.ip || '127.0.0.1',
          status,
        },
      });
    } catch (e) {
      console.error('Audit logging failed for reports:', e);
    }
  }

  // 1. Rent Roll
  async getRentRoll(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const data = await reportService.getRentRoll(user, req.query);
      await this.logAudit(req, 'Report Viewed', 'Rent Roll');
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  // 2. Occupancy
  async getOccupancy(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const data = await reportService.getOccupancy(user, req.query);
      await this.logAudit(req, 'Report Viewed', 'Occupancy');
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  // 3. Delinquency
  async getDelinquency(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const data = await reportService.getDelinquency(user, req.query);
      await this.logAudit(req, 'Report Viewed', 'Delinquency');
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  // 4. Profit & Loss
  async getProfitLoss(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      // RBAC check: Only Admins and Accountants can view financial statements
      if (user.role !== 'Admin' && user.role !== 'Accountant' && user.role !== 'SuperAdmin') {
        res.status(403).json({ message: 'Forbidden. You do not have permission to view financial statements.' });
        return;
      }
      const data = await reportService.getProfitLoss(user, req.query);
      await this.logAudit(req, 'Report Viewed', 'Profit & Loss');
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  // 5. Maintenance
  async getMaintenance(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const data = await reportService.getMaintenance(user, req.query);
      await this.logAudit(req, 'Report Viewed', 'Maintenance');
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  // 6. Payment History
  async getPaymentHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const data = await reportService.getPaymentHistory(user, req.query);
      await this.logAudit(req, 'Report Viewed', 'Payment History');
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  // Create Export History Entry
  async createExport(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const data = await reportService.createExport(user, req.body);
      
      // Trigger background processing asynchronously without awaiting
      exportService.processLargeExportInBackground(
        data.id,
        user,
        req.body.reportType,
        req.body.filters,
        req.body.fileType
      );

      await this.logAudit(req, 'Report Exported', req.body.reportType || 'General Report');
      res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }

  // Get Exports History
  async getExports(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const data = await reportService.getExports(user, req.query);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
}
export const reportController = new ReportController();
