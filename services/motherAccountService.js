import { supabase } from './supabaseClient';

export const motherAccountService = {
  async getAll(bankId) {
    const { data, error } = await supabase
      .from('mother_accounts')
      .select('*')
      .eq('bank_id', bankId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async getActive(bankId) {
    const { data, error } = await supabase
      .from('mother_accounts')
      .select('*')
      .eq('bank_id', bankId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async create(account) {
    const { data, error } = await supabase
      .from('mother_accounts')
      .insert(account)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('mother_accounts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateBalance(id, newBalance) {
    return this.update(id, { balance: newBalance });
  },

  async toggleActive(id, isActive) {
    return this.update(id, { is_active: isActive });
  },
};
