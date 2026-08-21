import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authRateLimiter } from '../middlewares/rateLimiter.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', authRateLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
router.post('/change-password', authMiddleware, (req, res, next) => authController.changePassword(req, res, next));
router.get('/plans', (req, res, next) => authController.getPublicPlans(req, res, next));
router.post('/create-hosted-payment', (req, res, next) => authController.createHostedPayment(req, res, next));

export default router;


