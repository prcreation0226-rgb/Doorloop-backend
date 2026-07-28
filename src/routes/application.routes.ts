import { Router } from 'express';
import { applicationController } from '../controllers/application.controller';

const router = Router();

router.get('/', (req, res, next) => applicationController.getAll(req, res, next));
router.post('/', (req, res, next) => applicationController.create(req, res, next));
router.put('/:id', (req, res, next) => applicationController.update(req, res, next));

export default router;
