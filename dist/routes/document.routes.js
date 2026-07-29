"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const document_controller_1 = require("../controllers/document.controller");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const router = (0, express_1.Router)();
// Owner Documents
router.get('/owner', (req, res, next) => document_controller_1.documentController.getOwnerDocuments(req, res, next));
router.post('/owner/upload', upload_middleware_1.uploadDocument.single('file'), (req, res, next) => document_controller_1.documentController.uploadOwnerDocument(req, res, next));
// Tenant Documents
router.get('/tenant', (req, res, next) => document_controller_1.documentController.getTenantDocuments(req, res, next));
router.post('/tenant/upload', upload_middleware_1.uploadDocument.single('file'), (req, res, next) => document_controller_1.documentController.uploadTenantDocument(req, res, next));
exports.default = router;
