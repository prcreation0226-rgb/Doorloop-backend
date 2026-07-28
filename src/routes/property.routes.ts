import { Router } from 'express';
import { propertyController } from '../controllers/property.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rbacGuard } from '../middlewares/rbac.middleware';

const router = Router();

router.get('/', (req, res, next) => propertyController.getAll(req, res, next));
router.get('/:id', (req, res, next) => propertyController.getById(req, res, next));
router.post('/', (req, res, next) => propertyController.create(req, res, next));
router.delete('/:id', (req, res, next) => propertyController.delete(req, res, next));

export default router;
