import { supabase } from './supabaseClient';

export const loanService = {
  // Issue a new loan
  async issueLoan(params) {
    const { data, error } = await supabase.rpc('process_loan_issue', {
      p_bank_id: params.bank_id,
      p_borrower_user_id: params.borrower_user_id,
      p_amount: parseFloat(params.amount),
      p_source_type: params.source_type,
      p_source_account_id: params.source_account_id || null,
      p_due_date: params.due_date || null,
      p_notes: params.notes || null,
    });
    if (error) throw error;
    return data;
  },

  // Return (full or partial) a loan
  async returnLoan(params) {
    const { data, error } = await supabase.rpc('process_loan_return', {
      p_loan_id: params.loan_id,
      p_amount: parseFloat(params.amount),
      p_notes: params.notes || null,
    });
    if (error) throw error;
    return data;
  },

  // Get all loans for a bank
  async getAll(bankId, filters = {}) {
    let query = supabase
      .from('loans')
      .select('*', { count: 'exact' })
      .eq('bank_id', bankId)
      .order('created_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.borrower_user_id) query = query.eq('borrower_user_id', filters.borrower_user_id);
    if (filters.limit) query = query.limit(filters.limit);
    if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    // Enrich with profile data (avoids FK join issues)
    if (data?.length) {
      const userIds = [...new Set(data.flatMap(l => [l.borrower_user_id, l.issued_by].filter(Boolean)))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      for (const loan of data) {
        loan.borrower = profileMap[loan.borrower_user_id] || null;
        loan.issuer = profileMap[loan.issued_by] || null;
      }
    }

    return { data, count };
  },

  // Get returns for a specific loan
  async getReturns(loanId) {
    const { data, error } = await supabase
      .from('loan_returns')
      .select('*')
      .eq('loan_id', loanId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Enrich with profile data
    if (data?.length) {
      const userIds = [...new Set(data.map(r => r.returned_by).filter(Boolean))];
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
        for (const ret of data) {
          ret.returned_by_profile = profileMap[ret.returned_by] || null;
        }
      }
    }

    return data;
  },
};
