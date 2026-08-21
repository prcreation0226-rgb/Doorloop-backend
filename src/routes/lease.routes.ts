import { Router } from 'express';
import { leaseController } from '../controllers/lease.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { createLeaseSchema, updateLeaseSchema } from '../validations/lease.validation';

const router = Router();

router.get('/', (req, res, next) => leaseController.getAll(req, res, next));
router.post('/', validateRequest(createLeaseSchema), (req, res, next) => leaseController.create(req, res, next));
router.put('/:id', validateRequest(updateLeaseSchema), (req, res, next) => leaseController.update(req, res, next));
router.delete('/:id', (req, res, next) => leaseController.delete(req, res, next));

export default router;
