import { create } from 'zustand';

export const useTransactionStore = create((set) => ({
  recentTransactions: [],
  todaySummary: {
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalCashIn: 0,
    totalExpenses: 0,
  },
  loading: false,

  setRecentTransactions: (transactions) => set({ recentTransactions: transactions }),
  setTodaySummary: (summary) => set({ todaySummary: summary }),
  setLoading: (loading) => set({ loading }),

  refreshKey: 0,
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
}));
