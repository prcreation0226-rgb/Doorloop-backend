import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authRateLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.post('/login', authRateLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));

export default router;
