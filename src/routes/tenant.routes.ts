import { Router } from 'express';
import { tenantController } from '../controllers/tenant.controller.js';

import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.get('/', (req, res, next) => tenantController.getAll(req, res, next));
router.post('/', upload.single('image'), (req, res, next) => tenantController.create(req, res, next));
router.get('/:id', (req, res, next) => tenantController.getById(req, res, next));
router.put('/:id', upload.single('image'), (req, res, next) => tenantController.update(req, res, next));
router.delete('/:id', (req, res, next) => tenantController.delete(req, res, next));

export default router;
