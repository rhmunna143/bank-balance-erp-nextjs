import { supabase } from './supabaseClient';
import { DEFAULT_EXPENSE_CATEGORIES } from '@/utils/constants';

export const bankService = {
  async create(bankData, userId) {
    // Step 1: Create bank — don't use .select() yet (SELECT RLS requires bank_members)
    const { data: bankRows, error: bankError } = await supabase
      .from('banks')
      .insert({
        name: bankData.name,
        currency: bankData.currency,
        owner_id: userId,
      })
      .select();
    // If .select() fails due to RLS, try without it
    let bank;
    if (bankError) {
      // Retry without .select() — INSERT may have succeeded
      const { error: bankError2 } = await supabase
        .from('banks')
        .insert({
          name: bankData.name,
          currency: bankData.currency,
          owner_id: userId,
        });
      if (bankError2) throw bankError2;
      // Fetch the bank we just created
      const { data: fetched, error: fetchError } = await supabase
        .from('banks')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (fetchError) throw fetchError;
      bank = fetched;
    } else {
      bank = bankRows[0];
    }

    // Step 2: Create bank_members record for owner — must happen before other inserts
    const { error: memberError } = await supabase
      .from('bank_members')
      .insert({
        bank_id: bank.id,
        user_id: userId,
        role: 'owner',
      });
    if (memberError) throw memberError;

    // Step 3: Create hand_cash_accounts default record
    const { error: handCashError } = await supabase
      .from('hand_cash_accounts')
      .insert({
        bank_id: bank.id,
        balance: 0,
      });
    if (handCashError) throw handCashError;

    // Step 4: Seed default expense categories
    const categories = DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
      bank_id: bank.id,
      name,
    }));
    const { error: catError } = await supabase
      .from('expense_categories')
      .insert(categories);
    if (catError) throw catError;

    return bank;
  },

  async getByOwner(userId) {
    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .eq('owner_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getByMember(userId) {
    const { data: membership, error: memError } = await supabase
      .from('bank_members')
      .select('bank_id, role, banks(*)')
      .eq('user_id', userId)
      .single();
    if (memError && memError.code !== 'PGRST116') throw memError;
    if (!membership) return null;
    return { ...membership.banks, userRole: membership.role };
  },

  async update(bankId, updates) {
    const { data, error } = await supabase
      .from('banks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', bankId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getExpenseCategories(bankId) {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('bank_id', bankId)
      .order('name');
    if (error) throw error;
    return data;
  },

  async addExpenseCategory(bankId, name) {
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({ bank_id: bankId, name })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteExpenseCategory(categoryId) {
    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', categoryId);
    if (error) throw error;
  },
};
