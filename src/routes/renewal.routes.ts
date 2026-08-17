import { Router } from 'express';
import { renewalController } from '../controllers/renewal.controller';

const router = Router();

router.get('/', (req, res, next) => renewalController.getAll(req, res, next));
router.post('/send-offer', (req, res, next) => renewalController.sendOffer(req, res, next));
router.post('/update', (req, res, next) => renewalController.update(req, res, next));
router.post('/accept', (req, res, next) => renewalController.accept(req, res, next));
router.post('/reject', (req, res, next) => renewalController.reject(req, res, next));

export default router;
