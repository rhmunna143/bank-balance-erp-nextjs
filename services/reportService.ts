"use server";

import prisma from '@/lib/prisma';
import { loanService } from './loanService';

export const reportService = {
  async generateReportData(bankId: string, startDate: string, endDate: string, reportType = 'full') {
    const startISO = new Date(`${startDate}T00:00:00`);
    const endISO = new Date(`${endDate}T23:59:59`);

    const includeTransactions = reportType !== 'expenses_only';
    const includeExpenses = reportType !== 'no_expenses';

    const promises: any[] = [];

    // Transactions (deposits, withdrawals, cash_in)
    if (includeTransactions) {
      promises.push(
        prisma.transaction.findMany({
          where: {
            bankId,
            createdAt: { gte: startISO, lte: endISO },
          },
          include: {
            motherAccount: { select: { name: true, accountNumber: true } },
            profitAccount: { select: { name: true } },
            performedBy: { select: { fullName: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 5000,
        })
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    // Expenses
    if (includeExpenses) {
      promises.push(
        prisma.expense.findMany({
          where: {
            bankId,
            createdAt: { gte: startISO, lte: endISO },
          },
          include: {
            category: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 5000,
        })
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    // Loan returns
    if (includeTransactions) {
      promises.push(loanService.getReturnsByDateRange(bankId, startISO.toISOString(), endISO.toISOString()));
    } else {
      promises.push(Promise.resolve([]));
    }

    // Daily logs
    promises.push(
      prisma.dailyLog.findMany({
        where: {
          bankId,
          logDate: { gte: startISO, lte: endISO }
        },
        orderBy: { logDate: 'desc' }
      })
    );

    // Hand cash
    promises.push(
      prisma.handCashAccount.findUnique({
        where: { bankId }
      })
    );

    // Mother accounts
    promises.push(
      prisma.motherAccount.findMany({
        where: { bankId }
      })
    );

    const [transactions, expensesData, loanReturns, dailyLogs, handCash, motherAccounts] = await Promise.all(promises);

    const txnData = transactions || [];
    const expenses = expensesData || [];

    const depositTxns = txnData.filter((t: any) => t.type === 'deposit');
    const withdrawalTxns = txnData.filter((t: any) => t.type === 'withdrawal');
    const cashInTxns = txnData.filter((t: any) => t.type === 'cash_in');

    const totalDeposits = depositTxns.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const totalWithdrawals = withdrawalTxns.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const totalCashIn = cashInTxns.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const totalExpenses = expenses.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const totalLoanReturns = (loanReturns || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

    // Group expenses by category
    const expensesByCategory: any = {};
    expenses.forEach((e: any) => {
      const catName = e.category?.name || 'Unknown';
      if (!expensesByCategory[catName]) expensesByCategory[catName] = 0;
      expensesByCategory[catName] += Number(e.amount);
    });

    const motherAccountBalances = (motherAccounts || []).map((ma: any) => ({
      id: ma.id,
      name: ma.name,
      account_number: ma.accountNumber,
      balance: Number(ma.balance || 0),
      is_active: ma.isActive,
    }));
    const totalMotherBalance = motherAccountBalances.reduce((sum: number, ma: any) => sum + ma.balance, 0);

    return {
      reportType,
      totalDeposits,
      totalWithdrawals,
      totalCashIn,
      totalExpenses,
      handCashBalance: Number(handCash?.balance || 0),
      motherAccountBalances,
      totalMotherBalance,
      netFlow: totalDeposits - totalWithdrawals + totalCashIn + totalLoanReturns - totalExpenses,
      transactions: txnData,
      loanReturns: loanReturns || [],
      deposits: depositTxns,
      withdrawals: withdrawalTxns,
      cashIns: cashInTxns,
      expenses: expenses,
      expensesByCategory,
      dailyLogs: dailyLogs || [],
      depositCount: depositTxns.length,
      withdrawalCount: withdrawalTxns.length,
      cashInCount: cashInTxns.length,
      loanReturnCount: (loanReturns || []).length,
      totalLoanReturns,
      expenseCount: expenses.length,
    };
  },
};
