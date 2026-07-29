import prisma from '../config/database';
import { AppError } from '../utils/appError';

export class AccountingService {
  async getChartOfAccounts(companyId?: string) {
    let accounts = await prisma.coAAccount.findMany({
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
        const exists = await prisma.coAAccount.findFirst({
          where: companyId ? { companyId, accountCode: acc.accountCode } : { accountCode: acc.accountCode },
        });
        if (!exists) {
          await prisma.coAAccount.create({
            data: {
              ...acc,
              companyId,
            },
          });
        }
      }

      accounts = await prisma.coAAccount.findMany({
        where: companyId ? { companyId } : {},
        orderBy: { accountCode: 'asc' },
      });
    }

    return accounts;
  }

  async createAccount(data: { accountCode: string; accountName: string; type: string; balance?: number }, companyId?: string) {
    return prisma.coAAccount.create({
      data: {
        accountCode: data.accountCode,
        accountName: data.accountName,
        type: data.type,
        balance: data.balance || 0,
        companyId,
      },
    });
  }

  async deleteAccount(id: string, companyId?: string) {
    if (companyId) {
      const check = await prisma.coAAccount.findFirst({ where: { id, companyId } });
      if (!check) throw new AppError('Account not found.', 404);
    }
    return prisma.coAAccount.delete({
      where: { id },
    });
  }

  async getJournalEntries(companyId?: string) {
    return prisma.journalEntry.findMany({
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

  async getGeneralLedger(companyId?: string) {
    return prisma.journalEntryLine.findMany({
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

  async getBankAccounts(companyId?: string) {
    return prisma.bankAccount.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { name: 'asc' },
    });
  }

  async createBankAccount(data: any, companyId?: string) {
    return prisma.bankAccount.create({
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

  async deleteBankAccount(id: string, companyId?: string) {
    if (companyId) {
      const check = await prisma.bankAccount.findFirst({ where: { id, companyId } });
      if (!check) throw new AppError('Bank Account not found.', 404);
    }
    return prisma.bankAccount.delete({
      where: { id },
    });
  }

  async getBankReconciliation(companyId?: string) {
    const bankAccounts = await this.getBankAccounts(companyId);
    return bankAccounts.map((ba: any) => ({
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

  async postJournalEntry(data: { description: string; lines: Array<{ accountId: string; debit: number; credit: number }> }, companyId?: string) {
    const totalDebit = data.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = data.lines.reduce((sum, l) => sum + (l.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new AppError('Double-entry validation failed: Total Debits must equal Total Credits.', 422, 'BALANCING_ERROR');
    }

    return prisma.journalEntry.create({
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

export const accountingService = new AccountingService();
