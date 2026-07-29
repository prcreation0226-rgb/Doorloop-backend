import { Router } from 'express';
import { moveOutController } from '../controllers/moveOut.controller';

const router = Router();

router.get('/', (req, res, next) => moveOutController.getAll(req, res, next));
router.get('/:id', (req, res, next) => moveOutController.getById(req, res, next));
router.post('/', (req, res, next) => moveOutController.create(req, res, next));
router.put('/:id', (req, res, next) => moveOutController.update(req, res, next));
router.post('/:id/start-inspection', (req, res, next) => moveOutController.startInspection(req, res, next));
router.post('/:id/review-damage', (req, res, next) => moveOutController.reviewDamage(req, res, next));
router.post('/:id/deposit-summary', (req, res, next) => moveOutController.saveDepositSummary(req, res, next));
router.post('/:id/complete', (req, res, next) => moveOutController.completeMoveOut(req, res, next));
router.post('/:id/cancel', (req, res, next) => moveOutController.cancelMoveOut(req, res, next));

export default router;
