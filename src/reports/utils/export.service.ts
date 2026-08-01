import fs from 'fs';
import path from 'path';
import { reportService } from '../services/report.service';
import { ReportRepository } from '../repositories/report.repository';

const reportRepository = new ReportRepository();

export class ExportService {
  // Asynchronously process the report in the background
  async processLargeExportInBackground(exportId: string, user: any, reportType: string, filters: any, fileType: string) {
    try {
      console.log(`[Queue Worker] Started background job ${exportId} for ${reportType}`);
      await reportRepository.updateExportStatus(exportId, 'Processing');

      // 1. Fetch the data based on report type
      let data: any[] = [];
      const parsedFilters = filters || {};

      switch (reportType.toUpperCase()) {
        case 'RENT_ROLL': {
          const res = await reportService.getRentRoll(user, parsedFilters);
          data = res.data;
          break;
        }
        case 'OCCUPANCY': {
          const res = await reportService.getOccupancy(user, parsedFilters);
          data = res.data;
          break;
        }
        case 'DELINQUENCY': {
          const res = await reportService.getDelinquency(user, parsedFilters);
          data = res.data;
          break;
        }
        case 'PROFIT_LOSS': {
          const res = await reportService.getProfitLoss(user, parsedFilters);
          // Format Profit & Loss hierarchical details into rows
          const pl = res.data;
          data = [
            { Category: '--- INCOME ---', Amount: '' },
            ...pl.income.map((i: any) => ({ Category: i.name, Amount: `$${i.amount.toFixed(2)}` })),
            { Category: 'Total Income', Amount: `$${pl.summary.totalIncome.toFixed(2)}` },
            { Category: '--- EXPENSES ---', Amount: '' },
            ...pl.expenses.map((e: any) => ({ Category: e.name, Amount: `$${e.amount.toFixed(2)}` })),
            { Category: 'Total Expenses', Amount: `$${pl.summary.totalExpenses.toFixed(2)}` },
            { Category: 'NET PROFIT', Amount: `$${pl.summary.netProfit.toFixed(2)}` },
          ];
          break;
        }
        case 'MAINTENANCE': {
          const res = await reportService.getMaintenance(user, parsedFilters);
          data = res.data;
          break;
        }
        case 'PAYMENT_HISTORY': {
          const res = await reportService.getPaymentHistory(user, parsedFilters);
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
        ...data.map((row) =>
          headers
            .map((fieldName) => {
              const val = row[fieldName];
              const stringVal = val === null || val === undefined ? '' : String(val);
              // Clean string for CSV escaping
              return `"${stringVal.replace(/"/g, '""')}"`;
            })
            .join(',')
        ),
      ];
      const fileContent = csvRows.join('\n');

      // 3. Save file locally (create public/reports folder if not exists)
      // We will save to a public folder served statically, or a temporary path.
      const publicDir = path.join(__dirname, '..', '..', '..', 'public');
      const reportsDir = path.join(publicDir, 'reports');
      
      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
      if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);

      const fileName = `export_${reportType.toLowerCase()}_${exportId}.${fileType.toLowerCase()}`;
      const filePath = path.join(reportsDir, fileName);

      fs.writeFileSync(filePath, fileContent, 'utf-8');

      // 4. Update the ReportExport with complete link
      const fileUrl = `/public/reports/${fileName}`;
      await reportRepository.updateExportStatus(exportId, 'Completed', fileUrl);
      console.log(`[Queue Worker] Finished background job ${exportId} successfully.`);
    } catch (e: any) {
      console.error(`[Queue Worker] Job ${exportId} failed:`, e.message || e);
      await reportRepository.updateExportStatus(exportId, 'Failed', undefined, e.message || 'Generation failed');
    }
  }
}
export const exportService = new ExportService();
