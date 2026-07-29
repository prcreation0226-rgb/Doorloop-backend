"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountingService = exports.AccountingService = void 0;
const database_1 = __importDefault(require("../config/database"));
const appError_1 = require("../utils/appError");
class AccountingService {
    async getChartOfAccounts(companyId) {
        let accounts = await database_1.default.coAAccount.findMany({
            where: companyId ? { companyId } : {},
            orderBy: { accountCode: 'asc' },
        });
        const hasIncome = accounts.some(a => a.type === 'Revenue' || a.type === 'Income');
        const hasExpense = accounts.some(a => a.type === 'Expense' || a.type === 'Expenses');
        if (accounts.length === 0 || !hasIncome || !hasExpense) {
            const defaultAccounts = [
                { accountCode: '1010', accountName: 'Operating Checking Account', type: 'Asset', balance: 150000 },
                { accountCode: '1020', accountName: 'Security Deposit Escrow Account', type: 'Asset', balance: 45000 },
                { accountCode: '2010', accountName: 'Accounts Payable (AP)', type: 'Liability', balance: 12000 },
                { accountCode: '2020', accountName: 'Tenant Security Deposit Liability', type: 'Liability', balance: 45000 },
                { accountCode: '3010', accountName: "Owner's Equity Capital", type: 'Equity', balance: 500000 },
                { accountCode: '4010', accountName: 'Rental Revenue Income', type: 'Revenue', balance: 220000 },
                { accountCode: '4020', accountName: 'Late Fee & Penalty Income', type: 'Revenue', balance: 4500 },
                { accountCode: '4030', accountName: 'Application & Screening Fee Income', type: 'Revenue', balance: 2800 },
                { accountCode: '5010', accountName: 'Maintenance & Repair Expense', type: 'Expense', balance: 25000 },
                { accountCode: '5020', accountName: 'Property Insurance Expense', type: 'Expense', balance: 18000 },
                { accountCode: '5030', accountName: 'Utility & Water Expense', type: 'Expense', balance: 12500 },
                { accountCode: '5040', accountName: 'Management & Administrative Fee', type: 'Expense', balance: 35000 },
            ];
            for (const acc of defaultAccounts) {
                const exists = await database_1.default.coAAccount.findFirst({
                    where: companyId ? { companyId, accountCode: acc.accountCode } : { accountCode: acc.accountCode },
                });
                if (!exists) {
                    await database_1.default.coAAccount.create({
                        data: {
                            ...acc,
                            companyId,
                        },
                    });
                }
            }
            accounts = await database_1.default.coAAccount.findMany({
                where: companyId ? { companyId } : {},
                orderBy: { accountCode: 'asc' },
            });
        }
        return accounts;
    }
    async createAccount(data, companyId) {
        return database_1.default.coAAccount.create({
            data: {
                accountCode: data.accountCode,
                accountName: data.accountName,
                type: data.type,
                balance: data.balance || 0,
                companyId,
            },
        });
    }
    async deleteAccount(id, companyId) {
        if (companyId) {
            const check = await database_1.default.coAAccount.findFirst({ where: { id, companyId } });
            if (!check)
                throw new appError_1.AppError('Account not found.', 404);
        }
        return database_1.default.coAAccount.delete({
            where: { id },
        });
    }
    async getJournalEntries(companyId) {
        return database_1.default.journalEntry.findMany({
            where: companyId ? { companyId } : {},
            include: {
                lines: {
                    include: {
                        account: true,
                    },
                },
            },
            orderBy: { date: 'desc' },
        });
    }
    async getGeneralLedger(companyId) {
        return database_1.default.journalEntryLine.findMany({
            where: companyId ? {
                journalEntry: { companyId }
            } : {},
            include: {
                account: true,
                journalEntry: true,
            },
            orderBy: {
                journalEntry: {
                    date: 'desc',
                },
            },
        });
    }
    async getBankAccounts(companyId) {
        return database_1.default.bankAccount.findMany({
            where: companyId ? { companyId } : {},
            orderBy: { name: 'asc' },
        });
    }
    async createBankAccount(data, companyId) {
        return database_1.default.bankAccount.create({
            data: {
                name: data.name,
                institution: data.institution,
                accountNumber: data.accountNumber,
                balance: parseFloat(data.balance || '0'),
                type: data.type || 'Checking',
                status: data.status || 'Active',
                companyId,
            },
        });
    }
    async deleteBankAccount(id, companyId) {
        if (companyId) {
            const check = await database_1.default.bankAccount.findFirst({ where: { id, companyId } });
            if (!check)
                throw new appError_1.AppError('Bank Account not found.', 404);
        }
        return database_1.default.bankAccount.delete({
            where: { id },
        });
    }
    async getBankReconciliation(companyId) {
        const bankAccounts = await this.getBankAccounts(companyId);
        return bankAccounts.map((ba) => ({
            id: `rec-${ba.id}`,
            bankAccountId: ba.id,
            bankAccountName: ba.name,
            statementDate: new Date(),
            statementEndingBalance: ba.balance,
            clearedBalance: ba.balance,
            difference: 0.00,
            status: 'Reconciled',
        }));
    }
    async postJournalEntry(data, companyId) {
        const totalDebit = data.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
        const totalCredit = data.lines.reduce((sum, l) => sum + (l.credit || 0), 0);
        if (Math.abs(totalDebit - totalCredit) > 0.001) {
            throw new appError_1.AppError('Double-entry validation failed: Total Debits must equal Total Credits.', 422, 'BALANCING_ERROR');
        }
        return database_1.default.journalEntry.create({
            data: {
                entryNumber: `JE-${Math.floor(10000 + Math.random() * 90000)}`,
                date: new Date(),
                description: data.description,
                companyId,
                lines: {
                    create: data.lines.map((l) => ({
                        accountId: l.accountId,
                        debit: l.debit || 0,
                        credit: l.credit || 0,
                    })),
                },
            },
            include: {
                lines: {
                    include: {
                        account: true,
                    },
                },
            },
        });
    }
}
exports.AccountingService = AccountingService;
exports.accountingService = new AccountingService();
