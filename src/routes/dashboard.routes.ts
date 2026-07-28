import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/metrics', (req, res, next) => dashboardController.getMetrics(req, res, next));
router.get('/charts', (req, res, next) => dashboardController.getChartData(req, res, next));

export default router;
