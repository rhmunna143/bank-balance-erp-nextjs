import { supabase } from './supabaseClient';

export const transactionService = {
  async processDeposit(params) {
    const { data, error } = await supabase.rpc('process_deposit', {
      p_bank_id: params.bank_id,
      p_customer_name: params.customer_name,
      p_customer_account: params.customer_account || null,
      p_trn_id: params.trn_id || null,
      p_amount: params.amount,
      p_commission: params.commission || 0,
      p_mother_account_id: params.mother_account_id,
      p_reference: params.reference || null,
      p_notes: params.notes || null,
      p_created_at: params.created_at || null,
    });
    if (error) throw error;
    return data;
  },

  async processWithdrawal(params) {
    const { data, error } = await supabase.rpc('process_withdrawal', {
      p_bank_id: params.bank_id,
      p_customer_name: params.customer_name,
      p_customer_account: params.customer_account || null,
      p_trn_id: params.trn_id || null,
      p_amount: params.amount,
      p_commission: params.commission || 0,
      p_mother_account_id: params.mother_account_id,
      p_reference: params.reference || null,
      p_notes: params.notes || null,
      p_created_at: params.created_at || null,
    });
    if (error) throw error;
    return data;
  },

  async processWithdrawalWithShortage(params) {
    const { data, error } = await supabase.rpc('process_withdrawal_with_shortage', {
      p_bank_id: params.bank_id,
      p_customer_name: params.customer_name,
      p_customer_account: params.customer_account || null,
      p_trn_id: params.trn_id || null,
      p_amount: params.amount,
      p_commission: params.commission || 0,
      p_mother_account_id: params.mother_account_id,
      p_shortage_amount: params.shortage_amount || 0,
      p_reference: params.reference || null,
      p_notes: params.notes || null,
      p_created_at: params.created_at || null,
    });
    if (error) throw error;
    return data;
  },

  async processCashIn(params) {
    const { data, error } = await supabase.rpc('process_cash_in', {
      p_bank_id: params.bank_id,
      p_trn_id: params.trn_id || null,
      p_amount: params.amount,
      p_target_type: params.target_type,
      p_target_id: params.target_id || null,
      p_source: params.source || null,
      p_reference: params.reference || null,
      p_notes: params.notes || null,
      p_created_at: params.created_at || null,
    });
    if (error) throw error;
    return data;
  },

  async processExpense(params) {
    const { data, error } = await supabase.rpc('process_expense', {
      p_bank_id: params.bank_id,
      p_trn_id: params.trn_id || null,
      p_amount: params.amount,
      p_category_id: params.category_id,
      p_deduct_from: params.deduct_from,
      p_profit_account_id: params.profit_account_id || null,
      p_mother_account_id: params.mother_account_id || null,
      p_description: params.description || null,
      p_receipt_url: params.receipt_url || null,
      p_created_at: params.created_at || null,
    });
    if (error) throw error;
    return data;
  },

  async processFundTransfer(params) {
    const { data, error } = await supabase.rpc('process_fund_transfer', {
      p_bank_id: params.bank_id,
      p_trn_id: params.trn_id || null,
      p_amount: params.amount,
      p_source_type: params.source_type,
      p_source_account_id: params.source_account_id || null,
      p_destination_type: params.destination_type,
      p_destination_account_id: params.destination_account_id || null,
      p_destination_name: params.destination_name || null,
      p_destination_account: params.destination_account || null,
      p_notes: params.notes || null,
      p_created_at: params.created_at || null,
    });
    if (error) throw error;
    return data;
  },

  async reverseTransaction(params) {
    const { data, error } = await supabase.rpc('reverse_transaction', {
      p_txn_id: params.txn_id,
      p_reason: params.reason || null,
      p_reversed_trn_id: params.reversed_trn_id || null,
    });
    if (error) throw error;
    return data;
  },

  async getTransactions(bankId, filters = {}) {
    let query = supabase
      .from('transactions')
      .select('*, mother_accounts(name, account_number), profit_accounts(name), performer:profiles!fk_transactions_performed_by_profiles(full_name)', { count: 'exact' })
      .eq('bank_id', bankId)
      .order('created_at', { ascending: false });

    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
    if (filters.motherAccountId) {
      query = query.eq('mother_account_id', filters.motherAccountId);
    }
    if (filters.performedBy) {
      query = query.eq('performed_by', filters.performedBy);
    }
    if (filters.search) {
      query = query.or(`trn_id.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,customer_account.ilike.%${filters.search}%,destination_name.ilike.%${filters.search}%,destination_account.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
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
      const userIds = [
        ...new Set(
          data
            .flatMap((txn) => [txn.performed_by, txn.reversed_by])
            .filter(Boolean)
        ),
      ];

      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

        for (const txn of data) {
          txn.performer_profile = profileMap[txn.performed_by] || txn.performer || null;
          txn.reversed_by_profile = profileMap[txn.reversed_by] || null;
        }
      }
    }

    return { data, count };
  },

  async getCashInTransactions(bankId, filters = {}) {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('bank_id', bankId)
      .eq('type', 'cash_in')
      .order('created_at', { ascending: false });

    if (filters.targetType) {
      query = query.eq('target_type', filters.targetType);
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

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getExpenses(bankId, filters = {}) {
    let query = supabase
      .from('expenses')
      .select('*, expense_categories(name)')
      .eq('bank_id', bankId)
      .order('created_at', { ascending: false });

    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters.deductedFromType) {
      query = query.eq('deducted_from_type', filters.deductedFromType);
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

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async updateTransaction(id, updates) {
    const { data, error } = await supabase.rpc('update_transaction', {
      p_txn_id: id,
      p_customer_name: updates.customer_name || null,
      p_customer_account: updates.customer_account || null,
      p_amount: updates.amount != null ? parseFloat(updates.amount) : null,
      p_notes: updates.notes || null,
      p_source: updates.source || null,
      p_trn_id: updates.trn_id || null,
    });
    if (error) throw error;
    return data;
  },

  async getTodaySummary(bankId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [deposits, withdrawals, cashIns, expenses] = await Promise.all([
      supabase
        .from('transactions')
        .select('amount')
        .eq('bank_id', bankId)
        .eq('type', 'deposit')
        .gte('created_at', todayISO),
      supabase
        .from('transactions')
        .select('amount')
        .eq('bank_id', bankId)
        .eq('type', 'withdrawal')
        .gte('created_at', todayISO),
      supabase
        .from('transactions')
        .select('amount')
        .eq('bank_id', bankId)
        .eq('type', 'cash_in')
        .gte('created_at', todayISO),
      supabase
        .from('expenses')
        .select('amount')
        .eq('bank_id', bankId)
        .gte('created_at', todayISO),
    ]);

    const sum = (result) =>
      (result.data || []).reduce((acc, item) => acc + parseFloat(item.amount), 0);

    return {
      totalDeposits: sum(deposits),
      totalWithdrawals: sum(withdrawals),
      totalCashIn: sum(cashIns),
      totalExpenses: sum(expenses),
    };
  },
};
