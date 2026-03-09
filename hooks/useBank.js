import { useBankStore } from '@/stores/bankStore';

export function useBank() {
  const store = useBankStore();

  const role = store.userRole;
  const isAdmin = role === 'owner' || role === 'admin';

  return {
    bank: store.bank,
    role,
    userRole: store.userRole,
    expenseCategories: store.expenseCategories,
    categories: store.expenseCategories,
    loading: store.loading,
    loadBank: store.loadBank,
    createBank: store.createBank,
    updateBank: store.updateBank,
    refreshBank: () => store.loadBank(store.bank?.owner_id),
    addExpenseCategory: store.addExpenseCategory,
    isAdmin,
    bankId: store.bank?.id,
    currencySymbol: store.bank?.currency === 'USD' ? '$' : '৳',
  };
}
