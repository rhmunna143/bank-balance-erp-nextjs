import { supabase } from './supabaseClient';

export const expenseService = {
  async getAll(bankId, filters = {}) {
    let query = supabase
      .from('expenses')
      .select('*, expense_categories(name), mother_accounts(name, account_number), profit_accounts(name)', { count: 'exact' })
      .eq('bank_id', bankId)
      .order('created_at', { ascending: false });

    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters.deductFrom) {
      query = query.eq('deduct_from', filters.deductFrom);
    }
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data, count };
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('expenses')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateExpense(id, updates) {
    const { data, error } = await supabase.rpc('update_expense', {
      p_expense_id: id,
      p_amount: updates.amount != null ? parseFloat(updates.amount) : null,
      p_category_id: updates.category_id || null,
      p_description: updates.description || null,
    });
    if (error) throw error;
    return data;
  },
};
