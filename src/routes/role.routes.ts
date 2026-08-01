import { Router } from 'express';
import { roleController } from '../controllers/role.controller';

const router = Router();

router.get('/', (req, res, next) => roleController.getAll(req, res, next));
router.post('/', (req, res, next) => roleController.create(req, res, next));
router.post('/:id/clone', (req, res, next) => roleController.clone(req, res, next));
router.put('/:id', (req, res, next) => roleController.update(req, res, next));
router.delete('/:id', (req, res, next) => roleController.delete(req, res, next));

export default router;
