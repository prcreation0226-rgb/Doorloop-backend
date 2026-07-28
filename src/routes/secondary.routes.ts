import { Router } from 'express';
import { secondaryController } from '../controllers/secondary.controller';

const router = Router();

// Announcements
router.get('/announcements', (req, res, next) => secondaryController.getAnnouncements(req, res, next));
router.post('/announcements', (req, res, next) => secondaryController.createAnnouncement(req, res, next));

// Insurance
router.get('/insurance', (req, res, next) => secondaryController.getInsurancePolicies(req, res, next));
router.post('/insurance', (req, res, next) => secondaryController.createInsurancePolicy(req, res, next));

// Promotions / Coupons
router.get('/promotions', (req, res, next) => secondaryController.getPromotions(req, res, next));
router.post('/promotions', (req, res, next) => secondaryController.createPromotion(req, res, next));

// Notifications
router.get('/notifications', (req, res, next) => secondaryController.getNotifications(req, res, next));
router.put('/notifications/:id/read', (req, res, next) => secondaryController.markNotificationRead(req, res, next));

// Documents
router.get('/documents', (req, res, next) => secondaryController.getDocuments(req, res, next));
router.post('/documents', (req, res, next) => secondaryController.createDocument(req, res, next));

// AI Chat
router.post('/ai/chat', (req, res, next) => secondaryController.processAiChat(req, res, next));

export default router;
