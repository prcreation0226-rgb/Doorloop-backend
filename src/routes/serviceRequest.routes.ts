import { Router } from 'express';
import { serviceRequestController } from '../controllers/serviceRequest.controller';

const router = Router();

router.get('/', (req, res, next) => serviceRequestController.getAll(req, res, next));
router.get('/:id', (req, res, next) => serviceRequestController.getById(req, res, next));
router.post('/', (req, res, next) => serviceRequestController.create(req, res, next));
router.put('/:id', (req, res, next) => serviceRequestController.update(req, res, next));
router.delete('/:id', (req, res, next) => serviceRequestController.remove(req, res, next));

export default router;
