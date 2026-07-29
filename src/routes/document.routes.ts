import { Router } from 'express';
import { documentController } from '../controllers/document.controller';
import { uploadDocument } from '../middlewares/upload.middleware';

const router = Router();

// Owner Documents
router.get('/owner', (req, res, next) => documentController.getOwnerDocuments(req, res, next));
router.post('/owner/upload', uploadDocument.single('file'), (req, res, next) => documentController.uploadOwnerDocument(req, res, next));

// Tenant Documents
router.get('/tenant', (req, res, next) => documentController.getTenantDocuments(req, res, next));
router.post('/tenant/upload', uploadDocument.single('file'), (req, res, next) => documentController.uploadTenantDocument(req, res, next));

export default router;
