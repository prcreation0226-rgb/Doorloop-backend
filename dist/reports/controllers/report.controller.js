"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportController = exports.ReportController = void 0;
const report_service_1 = require("../services/report.service");
const export_service_1 = require("../utils/export.service");
const database_1 = __importDefault(require("../../config/database"));
class ReportController {
    // Utility helper for logging report audit actions
    async logAudit(req, action, reportName, status = 'Success') {
        try {
            const user = req.user;
            if (!user)
                return;
            await database_1.default.auditLog.create({
                data: {
                    userId: user.id,
                    action,
                    module: 'Reports',
                    object: reportName,
                    ip: req.ip || '127.0.0.1',
                    status,
                },
            });
        }
        catch (e) {
            console.error('Audit logging failed for reports:', e);
        }
    }
    // 1. Rent Roll
    async getRentRoll(req, res, next) {
        try {
            const user = req.user;
            const data = await report_service_1.reportService.getRentRoll(user, req.query);
            await this.logAudit(req, 'Report Viewed', 'Rent Roll');
            res.json(data);
        }
        catch (error) {
            next(error);
        }
    }
    // 2. Occupancy
    async getOccupancy(req, res, next) {
        try {
            const user = req.user;
            const data = await report_service_1.reportService.getOccupancy(user, req.query);
            await this.logAudit(req, 'Report Viewed', 'Occupancy');
            res.json(data);
        }
        catch (error) {
            next(error);
        }
    }
    // 3. Delinquency
    async getDelinquency(req, res, next) {
        try {
            const user = req.user;
            const data = await report_service_1.reportService.getDelinquency(user, req.query);
            await this.logAudit(req, 'Report Viewed', 'Delinquency');
            res.json(data);
        }
        catch (error) {
            next(error);
        }
    }
    // 4. Profit & Loss
    async getProfitLoss(req, res, next) {
        try {
            const user = req.user;
            // RBAC check: Only Admins and Accountants can view financial statements
            if (user.role !== 'Admin' && user.role !== 'Accountant' && user.role !== 'SuperAdmin') {
                res.status(403).json({ message: 'Forbidden. You do not have permission to view financial statements.' });
                return;
            }
            const data = await report_service_1.reportService.getProfitLoss(user, req.query);
            await this.logAudit(req, 'Report Viewed', 'Profit & Loss');
            res.json(data);
        }
        catch (error) {
            next(error);
        }
    }
    // 5. Maintenance
    async getMaintenance(req, res, next) {
        try {
            const user = req.user;
            const data = await report_service_1.reportService.getMaintenance(user, req.query);
            await this.logAudit(req, 'Report Viewed', 'Maintenance');
            res.json(data);
        }
        catch (error) {
            next(error);
        }
    }
    // 6. Payment History
    async getPaymentHistory(req, res, next) {
        try {
            const user = req.user;
            const data = await report_service_1.reportService.getPaymentHistory(user, req.query);
            await this.logAudit(req, 'Report Viewed', 'Payment History');
            res.json(data);
        }
        catch (error) {
            next(error);
        }
    }
    // Create Export History Entry
    async createExport(req, res, next) {
        try {
            const user = req.user;
            const data = await report_service_1.reportService.createExport(user, req.body);
            // Trigger background processing asynchronously without awaiting
            export_service_1.exportService.processLargeExportInBackground(data.id, user, req.body.reportType, req.body.filters, req.body.fileType);
            await this.logAudit(req, 'Report Exported', req.body.reportType || 'General Report');
            res.status(201).json(data);
        }
        catch (error) {
            next(error);
        }
    }
    // Get Exports History
    async getExports(req, res, next) {
        try {
            const user = req.user;
            const data = await report_service_1.reportService.getExports(user, req.query);
            res.json(data);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ReportController = ReportController;
exports.reportController = new ReportController();
