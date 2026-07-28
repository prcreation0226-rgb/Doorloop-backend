import { Router } from 'express';
import { ownerController } from '../controllers/owner.controller.js';

const router = Router();

router.get('/', (req, res, next) => ownerController.getAll(req, res, next));
router.post('/', (req, res, next) => ownerController.create(req, res, next));

export default router;
