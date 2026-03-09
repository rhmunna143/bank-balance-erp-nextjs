import { create } from 'zustand';
import { bankService } from '@/services/bankService';

export const useBankStore = create((set, get) => ({
  bank: null,
  userRole: null,
  expenseCategories: [],
  loading: true,
  loaded: false,

  loadBank: async (userId) => {
    set({ loading: true });
    try {
      const result = await bankService.getByMember(userId);
      if (result) {
        const { userRole, ...bank } = result;
        const categories = await bankService.getExpenseCategories(bank.id);
        set({ bank, userRole, expenseCategories: categories, loading: false, loaded: true });
        return bank;
      }
      set({ bank: null, userRole: null, loading: false, loaded: true });
      return null;
    } catch (error) {
      console.error('Load bank error:', error);
      set({ bank: null, userRole: null, loading: false, loaded: true });
      return null;
    }
  },

  createBank: async (bankData, userId) => {
    const bank = await bankService.create(bankData, userId);
    let categories = [];
    try {
      categories = await bankService.getExpenseCategories(bank.id);
    } catch (e) {
      console.warn('Could not load categories after bank creation:', e);
    }
    set({ bank, userRole: 'owner', expenseCategories: categories, loading: false });
    return bank;
  },

  updateBank: async (updates) => {
    const { bank } = get();
    if (!bank) return;
    const updated = await bankService.update(bank.id, updates);
    set({ bank: updated });
    return updated;
  },

  addExpenseCategory: async (name) => {
    const { bank, expenseCategories } = get();
    if (!bank) return;
    const category = await bankService.addExpenseCategory(bank.id, name);
    set({ expenseCategories: [...expenseCategories, category] });
    return category;
  },

  isAdmin: () => {
    const role = get().userRole;
    return role === 'owner' || role === 'admin';
  },
}));
