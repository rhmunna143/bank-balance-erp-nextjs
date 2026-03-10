import { create } from 'zustand';
import { bankService } from '@/services/bankService';
import { supabase } from '@/services/supabaseClient';

export const useBankStore = create((set, get) => ({
  bank: null,
  userRole: null,
  bankSlug: null,
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
        set({ bank, userRole, bankSlug: bank.slug, expenseCategories: categories, loading: false, loaded: true });
        return bank;
      }
      set({ bank: null, userRole: null, bankSlug: null, loading: false, loaded: true });
      return null;
    } catch (error) {
      console.error('Load bank error:', error);
      // Don't mark as loaded on error — allow retry
      set({ loading: false });
      return null;
    }
  },

  loadBankBySlug: async (slug) => {
    set({ loading: true });
    try {
      const bank = await bankService.getBySlug(slug);
      if (bank) {
        // Try to resolve the user's role for this bank
        let userRole = null;
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: membership } = await supabase
              .from('bank_members')
              .select('role')
              .eq('bank_id', bank.id)
              .eq('user_id', user.id)
              .maybeSingle();
            userRole = membership?.role || null;
          }
        } catch (_) {
          // Not authenticated or no membership — leave role null
        }
        const categories = userRole ? await bankService.getExpenseCategories(bank.id) : [];
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

  createBank: async (bankData, userId) => {
    const bank = await bankService.create(bankData, userId);
    let categories = [];
    try {
      categories = await bankService.getExpenseCategories(bank.id);
    } catch (e) {
      console.warn('Could not load categories after bank creation:', e);
    }
    set({ bank, userRole: 'owner', bankSlug: bank.slug, expenseCategories: categories, loading: false });
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
