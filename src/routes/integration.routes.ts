import { Router } from 'express';
import { integrationController } from '../controllers/integration.controller';

const router = Router();

router.get('/', (req, res, next) => integrationController.getAll(req, res, next));
router.post('/update', (req, res, next) => integrationController.update(req, res, next));
router.post('/test', (req, res, next) => integrationController.test(req, res, next));

export default router;
