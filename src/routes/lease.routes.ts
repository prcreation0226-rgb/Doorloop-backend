import { Router } from 'express';
import { leaseController } from '../controllers/lease.controller';

const router = Router();

router.get('/', (req, res, next) => leaseController.getAll(req, res, next));
router.post('/', (req, res, next) => leaseController.create(req, res, next));
router.put('/:id', (req, res, next) => leaseController.update(req, res, next));
router.delete('/:id', (req, res, next) => leaseController.delete(req, res, next));

export default router;
