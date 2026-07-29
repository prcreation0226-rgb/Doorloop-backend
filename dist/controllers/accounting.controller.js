"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountingController = exports.AccountingController = void 0;
const accounting_service_1 = require("../services/accounting.service");
const apiResponse_1 = require("../utils/apiResponse");
class AccountingController {
    async getCoA(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const coa = await accounting_service_1.accountingService.getChartOfAccounts(companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: coa });
        }
        catch (error) {
            next(error);
        }
    }
    async createAccount(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const { accountNumber, accountCode, accountName, accountType, type, balance } = req.body;
            const mappedType = type || (accountType === 'Assets' ? 'Asset' :
                accountType === 'Liabilities' ? 'Liability' :
                    accountType === 'Equity' ? 'Equity' :
                        accountType === 'Income' ? 'Revenue' :
                            accountType === 'Expenses' ? 'Expense' : 'Asset');
            const account = await accounting_service_1.accountingService.createAccount({
                accountCode: accountCode || accountNumber || `ACC-${Date.now()}`,
                accountName: accountName || 'Unnamed Account',
                type: mappedType,
                balance: balance ? parseFloat(balance) : 0,
            }, companyId);
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: account });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteAccount(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            await accounting_service_1.accountingService.deleteAccount(req.params.id, companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: { success: true } });
        }
        catch (error) {
            next(error);
        }
    }
    async getJournalEntries(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const entries = await accounting_service_1.accountingService.getJournalEntries(companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: entries });
        }
        catch (error) {
            next(error);
        }
    }
    async getGeneralLedger(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const ledger = await accounting_service_1.accountingService.getGeneralLedger(companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: ledger });
        }
        catch (error) {
            next(error);
        }
    }
    async getBankAccounts(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const bankAccounts = await accounting_service_1.accountingService.getBankAccounts(companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: bankAccounts });
        }
        catch (error) {
            next(error);
        }
    }
    async createBankAccount(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const bankAccount = await accounting_service_1.accountingService.createBankAccount(req.body, companyId);
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: bankAccount });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteBankAccount(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            await accounting_service_1.accountingService.deleteBankAccount(req.params.id, companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: { success: true } });
        }
        catch (error) {
            next(error);
        }
    }
    async getBankReconciliation(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const recon = await accounting_service_1.accountingService.getBankReconciliation(companyId);
            return (0, apiResponse_1.sendSuccess)({ res, data: recon });
        }
        catch (error) {
            next(error);
        }
    }
    async postJournalEntry(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const entry = await accounting_service_1.accountingService.postJournalEntry(req.body, companyId);
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: entry });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AccountingController = AccountingController;
exports.accountingController = new AccountingController();
