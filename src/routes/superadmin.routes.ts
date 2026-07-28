import { Router } from 'express';
import { superAdminController } from '../controllers/superadmin.controller';

const router = Router();

// Companies
router.get('/companies', (req, res, next) => superAdminController.getCompanies(req, res, next));
router.post('/companies', (req, res, next) => superAdminController.createCompany(req, res, next));
router.get('/companies/:id', (req, res, next) => superAdminController.getCompanyById(req, res, next));
router.put('/companies/:id', (req, res, next) => superAdminController.updateCompany(req, res, next));
router.delete('/companies/:id', (req, res, next) => superAdminController.deleteCompany(req, res, next));

// Company Users
router.get('/company-users', (req, res, next) => superAdminController.getCompanyUsers(req, res, next));
router.post('/company-users', (req, res, next) => superAdminController.createCompanyUser(req, res, next));
router.put('/company-users/:id/status', (req, res, next) => superAdminController.updateCompanyUserStatus(req, res, next));
router.delete('/company-users/:id', (req, res, next) => superAdminController.deleteCompanyUser(req, res, next));

// SaaS Subscription Plans
router.get('/plans', (req, res, next) => superAdminController.getPlans(req, res, next));
router.post('/plans', (req, res, next) => superAdminController.createPlan(req, res, next));

// SaaS Invoices
router.get('/invoices', (req, res, next) => superAdminController.getInvoices(req, res, next));
router.post('/invoices', (req, res, next) => superAdminController.createInvoice(req, res, next));
router.put('/invoices/:id/status', (req, res, next) => superAdminController.updateInvoiceStatus(req, res, next));

// Stats
router.get('/stats', (req, res, next) => superAdminController.getStats(req, res, next));

// Platform Settings
router.get('/settings', (req, res, next) => superAdminController.getSettings(req, res, next));
router.post('/settings', (req, res, next) => superAdminController.updateSettings(req, res, next));

// Audit Logs
router.get('/audit-logs', (req, res, next) => superAdminController.getAuditLogs(req, res, next));
router.post('/audit-logs', (req, res, next) => superAdminController.createAuditLog(req, res, next));

export default router;
