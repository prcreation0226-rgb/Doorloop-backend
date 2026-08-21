import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { createPaymentSchema } from '../validations/payment.validation';

const router = Router();

router.get('/', (req, res, next) => paymentController.getAll(req, res, next));
router.post('/', validateRequest(createPaymentSchema), (req, res, next) => paymentController.processPayment(req, res, next));

export default router;
