import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { superAdminService } from '../services/superadmin.service';
import { authorizeNetService } from '../services/authorizeNet.service';
import { sendSuccess } from '../utils/apiResponse';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      return sendSuccess({ res, data: result, message: 'Authentication successful.' });
    } catch (error) {
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await superAdminService.createCompany(req.body);
      return sendSuccess({ res, statusCode: 201, data: result, message: 'Registration successful.' });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      return sendSuccess({ res, data: result });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: any, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userEmail = req.user?.email;
      const result = await authService.changePassword(userEmail, currentPassword, newPassword);
      return sendSuccess({ res, data: result, message: 'Password changed successfully.' });
    } catch (error) {
      next(error);
    }
  }

  async getPublicPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await superAdminService.getPlans();
      return sendSuccess({ res, data: plans });
    } catch (error) {
      next(error);
    }
  }

  async createHostedPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount, planName, description } = req.body;
      const result = await authorizeNetService.getHostedPaymentToken({
        amount: Number(amount) || 99,
        planName: planName || 'Subscription Plan',
        description: description || `SaaS Subscription Plan: ${planName}`,
      });
      return sendSuccess({ res, data: result, message: 'Hosted payment token generated successfully.' });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();


