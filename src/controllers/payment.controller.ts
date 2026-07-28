import { Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class PaymentController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const payments = await paymentService.getAllPayments(companyId);
      return sendSuccess({ res, data: payments });
    } catch (error) {
      next(error);
    }
  }

  async processPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user?.companyId;
      const payment = await paymentService.processPayment({ ...req.body, companyId });
      return sendSuccess({ res, statusCode: 201, data: payment });
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
