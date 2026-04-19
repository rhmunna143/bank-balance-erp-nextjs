import { transactionService } from './transactionService';
import { expenseService } from './expenseService';
import { dailyLogService } from './dailyLogService';
import { handCashService } from './handCashService';
import { motherAccountService } from './motherAccountService';
import { loanService } from './loanService';

export const reportService = {
  async generateReportData(bankId, startDate, endDate, reportType = 'full') {
    const startISO = `${startDate}T00:00:00`;
    const endISO = `${endDate}T23:59:59`;

    const includeTransactions = reportType !== 'expenses_only';
    const includeExpenses = reportType !== 'no_expenses';

    const promises = [];

    // Transactions (deposits, withdrawals, cash_in) — single query gets ALL types
    if (includeTransactions) {
      promises.push(
        transactionService.getTransactions(bankId, {
          startDate: startISO,
          endDate: endISO,
          limit: 5000,
          excludeReversed: true,
        }),
      );
    } else {
      promises.push(Promise.resolve({ data: [] }));
    }

    // Expenses
    if (includeExpenses) {
      promises.push(
        expenseService.getAll(bankId, { startDate: startISO, endDate: endISO, limit: 5000 }),
      );
    } else {
      promises.push(Promise.resolve({ data: [] }));
    }

    // Loan returns (treated as transaction-side data)
    if (includeTransactions) {
      promises.push(loanService.getReturnsByDateRange(bankId, startISO, endISO));
    } else {
      promises.push(Promise.resolve([]));
    }

    // Daily logs + hand cash + mother accounts
    promises.push(
      dailyLogService.getByDateRange(bankId, startDate, endDate),
      handCashService.get(bankId),
      motherAccountService.getAll(bankId),
    );

    const [transactions, expensesResult, loanReturns, dailyLogs, handCash, motherAccounts] = await Promise.all(promises);

    // All transactions come from a single query — no duplicates
    const txnData = (transactions.data || transactions || [])
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const expensesData = expensesResult.data || expensesResult || [];

    const depositTxns = txnData.filter((t) => t.type === 'deposit');
    const withdrawalTxns = txnData.filter((t) => t.type === 'withdrawal');
    const cashInTxns = txnData.filter((t) => t.type === 'cash_in');

    const totalDeposits = depositTxns.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalWithdrawals = withdrawalTxns.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalCashIn = cashInTxns.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpenses = expensesData.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalLoanReturns = (loanReturns || []).reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

    // Group expenses by category
    const expensesByCategory = {};
    expensesData.forEach((e) => {
      const catName = e.expense_categories?.name || 'Unknown';
      if (!expensesByCategory[catName]) expensesByCategory[catName] = 0;
      expensesByCategory[catName] += parseFloat(e.amount);
    });

    // Mother account balances
    const motherAccountBalances = (motherAccounts || []).map((ma) => ({
      id: ma.id,
      name: ma.name,
      account_number: ma.account_number,
      balance: parseFloat(ma.balance || 0),
      is_active: ma.is_active,
    }));
    const totalMotherBalance = motherAccountBalances.reduce((sum, ma) => sum + ma.balance, 0);

    return {
      reportType,
      totalDeposits,
      totalWithdrawals,
      totalCashIn,
      totalExpenses,
      handCashBalance: parseFloat(handCash?.balance || 0),
      motherAccountBalances,
      totalMotherBalance,
      netFlow: totalDeposits - totalWithdrawals + totalCashIn + totalLoanReturns - totalExpenses,
      transactions: txnData,
      loanReturns: loanReturns || [],
      deposits: depositTxns,
      withdrawals: withdrawalTxns,
      cashIns: cashInTxns,
      expenses: expensesData,
      expensesByCategory,
      dailyLogs: dailyLogs || [],
      depositCount: depositTxns.length,
      withdrawalCount: withdrawalTxns.length,
      cashInCount: cashInTxns.length,
      loanReturnCount: (loanReturns || []).length,
      totalLoanReturns,
      expenseCount: expensesData.length,
    };
  },
};
