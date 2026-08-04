"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportService = exports.ExportService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const report_service_1 = require("../services/report.service");
const report_repository_1 = require("../repositories/report.repository");
const reportRepository = new report_repository_1.ReportRepository();
class ExportService {
    // Asynchronously process the report in the background
    async processLargeExportInBackground(exportId, user, reportType, filters, fileType) {
        try {
            console.log(`[Queue Worker] Started background job ${exportId} for ${reportType}`);
            await reportRepository.updateExportStatus(exportId, 'Processing');
            // 1. Fetch the data based on report type
            let data = [];
            const parsedFilters = filters || {};
            switch (reportType.toUpperCase()) {
                case 'RENT_ROLL': {
                    const res = await report_service_1.reportService.getRentRoll(user, parsedFilters);
                    data = res.data;
                    break;
                }
                case 'OCCUPANCY': {
                    const res = await report_service_1.reportService.getOccupancy(user, parsedFilters);
                    data = res.data;
                    break;
                }
                case 'DELINQUENCY': {
                    const res = await report_service_1.reportService.getDelinquency(user, parsedFilters);
                    data = res.data;
                    break;
                }
                case 'PROFIT_LOSS': {
                    const res = await report_service_1.reportService.getProfitLoss(user, parsedFilters);
                    // Format Profit & Loss hierarchical details into rows
                    const pl = res.data;
                    data = [
                        { Category: '--- INCOME ---', Amount: '' },
                        ...pl.income.map((i) => ({ Category: i.name, Amount: `$${i.amount.toFixed(2)}` })),
                        { Category: 'Total Income', Amount: `$${pl.summary.totalIncome.toFixed(2)}` },
                        { Category: '--- EXPENSES ---', Amount: '' },
                        ...pl.expenses.map((e) => ({ Category: e.name, Amount: `$${e.amount.toFixed(2)}` })),
                        { Category: 'Total Expenses', Amount: `$${pl.summary.totalExpenses.toFixed(2)}` },
                        { Category: 'NET PROFIT', Amount: `$${pl.summary.netProfit.toFixed(2)}` },
                    ];
                    break;
                }
                case 'MAINTENANCE': {
                    const res = await report_service_1.reportService.getMaintenance(user, parsedFilters);
                    data = res.data;
                    break;
                }
                case 'PAYMENT_HISTORY': {
                    const res = await report_service_1.reportService.getPaymentHistory(user, parsedFilters);
                    data = res.data;
                    break;
                }
                default:
                    throw new Error(`Unknown report type: ${reportType}`);
            }
            // Simulate slight processing lag for large files
            await new Promise((resolve) => setTimeout(resolve, 1000));
            if (!data || data.length === 0) {
                data = [{ Status: 'No records found for specified date filters', Date: new Date().toISOString().split('T')[0] }];
            }
            // 2. Generate file content (CSV layout)
            const headers = Object.keys(data[0]);
            const csvRows = [
                headers.join(','), // Header row
                ...data.map((row) => headers
                    .map((fieldName) => {
                    const val = row[fieldName];
                    const stringVal = val === null || val === undefined ? '' : String(val);
                    // Clean string for CSV escaping
                    return `"${stringVal.replace(/"/g, '""')}"`;
                })
                    .join(',')),
            ];
            const fileContent = csvRows.join('\n');
            // 3. Save file locally (create public/reports folder if not exists)
            // We will save to a public folder served statically, or a temporary path.
            const publicDir = path_1.default.join(__dirname, '..', '..', '..', 'public');
            const reportsDir = path_1.default.join(publicDir, 'reports');
            if (!fs_1.default.existsSync(publicDir))
                fs_1.default.mkdirSync(publicDir);
            if (!fs_1.default.existsSync(reportsDir))
                fs_1.default.mkdirSync(reportsDir);
            const fileName = `export_${reportType.toLowerCase()}_${exportId}.${fileType.toLowerCase()}`;
            const filePath = path_1.default.join(reportsDir, fileName);
            fs_1.default.writeFileSync(filePath, fileContent, 'utf-8');
            // 4. Update the ReportExport with complete link
            const fileUrl = `/public/reports/${fileName}`;
            await reportRepository.updateExportStatus(exportId, 'Completed', fileUrl);
            console.log(`[Queue Worker] Finished background job ${exportId} successfully.`);
        }
        catch (e) {
            console.error(`[Queue Worker] Job ${exportId} failed:`, e.message || e);
            await reportRepository.updateExportStatus(exportId, 'Failed', undefined, e.message || 'Generation failed');
        }
    }
}
exports.ExportService = ExportService;
exports.exportService = new ExportService();
