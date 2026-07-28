import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';

const router = Router();

router.get('/', (req, res, next) => paymentController.getAll(req, res, next));
router.post('/', (req, res, next) => paymentController.processPayment(req, res, next));

export default router;
