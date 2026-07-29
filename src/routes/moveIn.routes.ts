import { Router } from 'express';
import { moveInController } from '../controllers/moveIn.controller';

const router = Router();

router.get('/', (req, res, next) => moveInController.getAll(req, res, next));
router.get('/:id', (req, res, next) => moveInController.getById(req, res, next));
router.post('/', (req, res, next) => moveInController.create(req, res, next));
router.put('/:id', (req, res, next) => moveInController.update(req, res, next));
router.post('/:id/start-inspection', (req, res, next) => moveInController.startInspection(req, res, next));
router.post('/:id/complete', (req, res, next) => moveInController.completeMoveIn(req, res, next));

export default router;
