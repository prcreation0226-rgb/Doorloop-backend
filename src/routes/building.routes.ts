import { Router } from 'express';
import { buildingController } from '../controllers/building.controller';

const router = Router();

router.get('/', (req, res, next) => buildingController.getAll(req, res, next));
router.post('/', (req, res, next) => buildingController.create(req, res, next));
router.put('/:id', (req, res, next) => buildingController.update(req, res, next));
router.delete('/:id', (req, res, next) => buildingController.delete(req, res, next));

export default router;
