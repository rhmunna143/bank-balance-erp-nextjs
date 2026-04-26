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
    if (filters.excludeReversed) {
      query = query.eq('is_reversed', false);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    if (data?.length) {
      const userIds = [...new Set(data.map((exp) => exp.reversed_by).filter(Boolean))];

      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

        for (const expense of data) {
          expense.reversed_by_profile = profileMap[expense.reversed_by] || null;
        }
      }
    }

    return { data, count };
  },

  async reverseExpense(params) {
    const { data, error } = await supabase.rpc('reverse_expense', {
      p_expense_id: params.expense_id,
      p_reason: params.reason || null,
      p_reversed_trn_id: params.reversed_trn_id || null,
    });
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('expenses')
      .update({ ...updates })
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
