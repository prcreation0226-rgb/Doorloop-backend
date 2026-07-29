import { Router } from 'express';
import { inspectionController } from '../controllers/inspection.controller';

const router = Router();

router.get('/inspectors', (req, res, next) => inspectionController.getInspectors(req, res, next));
router.get('/:id', (req, res, next) => inspectionController.getById(req, res, next));
router.put('/:id', (req, res, next) => inspectionController.update(req, res, next));
router.post('/:id/complete', (req, res, next) => inspectionController.complete(req, res, next));
router.post('/:id/reopen', (req, res, next) => inspectionController.reopen(req, res, next));

export default router;
