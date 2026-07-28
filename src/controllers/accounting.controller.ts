import { Response, NextFunction } from 'express';
import { accountingService } from '../services/accounting.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class AccountingController {
  async getCoA(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const coa = await accountingService.getChartOfAccounts(companyId);
      return sendSuccess({ res, data: coa });
    } catch (error) {
      next(error);
    }
  }

  async createAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const account = await accountingService.createAccount(req.body, companyId);
      return sendSuccess({ res, statusCode: 201, data: account });
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      await accountingService.deleteAccount(req.params.id as string, companyId);
      return sendSuccess({ res, data: { success: true } });
    } catch (error) {
      next(error);
    }
  }

  async getJournalEntries(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const entries = await accountingService.getJournalEntries(companyId);
      return sendSuccess({ res, data: entries });
    } catch (error) {
      next(error);
    }
  }

  async getGeneralLedger(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const ledger = await accountingService.getGeneralLedger(companyId);
      return sendSuccess({ res, data: ledger });
    } catch (error) {
      next(error);
    }
  }

  async getBankAccounts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const bankAccounts = await accountingService.getBankAccounts(companyId);
      return sendSuccess({ res, data: bankAccounts });
    } catch (error) {
      next(error);
    }
  }

  async createBankAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const bankAccount = await accountingService.createBankAccount(req.body, companyId);
      return sendSuccess({ res, statusCode: 201, data: bankAccount });
    } catch (error) {
      next(error);
    }
  }

  async deleteBankAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      await accountingService.deleteBankAccount(req.params.id as string, companyId);
      return sendSuccess({ res, data: { success: true } });
    } catch (error) {
      next(error);
    }
  }

  async getBankReconciliation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const recon = await accountingService.getBankReconciliation(companyId);
      return sendSuccess({ res, data: recon });
    } catch (error) {
      next(error);
    }
  }

  async postJournalEntry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const entry = await accountingService.postJournalEntry(req.body, companyId);
      return sendSuccess({ res, statusCode: 201, data: entry });
    } catch (error) {
      next(error);
    }
  }
}

export const accountingController = new AccountingController();
