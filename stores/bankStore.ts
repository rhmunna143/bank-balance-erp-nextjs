import { create } from 'zustand';
import { getBankByMember, getBankBySlug, createBank, updateBank, getExpenseCategories, addExpenseCategory } from '@/services/bankService';

export const useBankStore = create((set: any, get: any) => ({
  bank: null as any,
  userRole: null,
  bankSlug: null,
  expenseCategories: [],
  loading: false,
  loaded: false,

  loadBank: async () => {
    set({ loading: true });
    try {
      const result = await getBankByMember();
      if (result) {
        const { userRole, ...bank } = result;
        const categories = await getExpenseCategories(bank.id);
        set({ bank, userRole, bankSlug: bank.slug, expenseCategories: categories, loading: false, loaded: true });
        return bank;
      }
      set({ bank: null, userRole: null, bankSlug: null, loading: false, loaded: true });
      return null;
    } catch (error) {
      console.error('Load bank error:', error);
      set({ bank: null, userRole: null, bankSlug: null, loading: false, loaded: true });
      return null;
    }
  },

  loadBankBySlug: async (slug: string) => {
    set({ loading: true });
    try {
      const bank = await getBankBySlug(slug);
      if (bank) {
        // Since we are migrating away from Supabase client-side queries,
        // we assume for now that if they can access this via a slug they are either an owner or viewing a public landing page.
        // A dedicated Server Action should be written if fine-grained role checks are needed here.
        let userRole = null; 
        
        const categories = userRole ? await getExpenseCategories(bank.id) : [];
        set({ bank, userRole, bankSlug: slug, expenseCategories: categories, loading: false, loaded: true });
        return bank;
      }
      set({ bank: null, userRole: null, bankSlug: null, loading: false, loaded: true });
      return null;
    } catch (error) {
      console.error('Load bank by slug error:', error);
      set({ bank: null, userRole: null, bankSlug: null, loading: false, loaded: true });
      return null;
    }
  },

  createBank: async (bankData: any) => {
    const bank = await createBank(bankData);
    let categories: any[] = [];
    try {
      categories = await getExpenseCategories(bank.id);
    } catch (e) {
      console.warn('Could not load categories after bank creation:', e);
    }
    set({ bank, userRole: 'owner', bankSlug: bank.slug, expenseCategories: categories, loading: false });
    return bank;
  },

  updateBank: async (updates: any) => {
    const { bank } = get();
    if (!bank) return;
    const updated = await updateBank(bank.id, updates);
    set({ bank: updated });
    return updated;
  },

  addExpenseCategory: async (name: string) => {
    const { bank, expenseCategories } = get();
    if (!bank) return;
    const category = await addExpenseCategory(bank.id, name);
    set({ expenseCategories: [...expenseCategories, category] });
    return category;
  },

  isAdmin: () => {
    const role = get().userRole;
    return role === 'owner' || role === 'admin';
  },
}));
