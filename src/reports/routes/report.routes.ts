import { Router } from 'express';
import { reportController } from '../controllers/report.controller';

const router = Router();

router.get('/rent-roll', (req, res, next) => reportController.getRentRoll(req, res, next));
router.get('/occupancy', (req, res, next) => reportController.getOccupancy(req, res, next));
router.get('/delinquency', (req, res, next) => reportController.getDelinquency(req, res, next));
router.get('/profit-loss', (req, res, next) => reportController.getProfitLoss(req, res, next));
router.get('/maintenance', (req, res, next) => reportController.getMaintenance(req, res, next));
router.get('/payment-history', (req, res, next) => reportController.getPaymentHistory(req, res, next));

router.get('/exports', (req, res, next) => reportController.getExports(req, res, next));
router.post('/exports', (req, res, next) => reportController.createExport(req, res, next));

export default router;
