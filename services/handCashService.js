import { supabase } from './supabaseClient';

export const handCashService = {
  async get(bankId) {
    const { data, error } = await supabase
      .from('hand_cash_accounts')
      .select('*')
      .eq('bank_id', bankId)
      .single();
    if (error) throw error;
    return data;
  },

  async updateBalance(bankId, newBalance) {
    const { data, error } = await supabase
      .from('hand_cash_accounts')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('bank_id', bankId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateThreshold(bankId, threshold) {
    const { data, error } = await supabase
      .from('hand_cash_accounts')
      .update({ low_threshold: threshold, updated_at: new Date().toISOString() })
      .eq('bank_id', bankId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
