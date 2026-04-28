import { supabase } from './supabaseClient';

export const loanService = {
  // Issue a new loan
  async issueLoan(params) {
    const { data, error } = await supabase.rpc('process_loan_issue', {
      p_bank_id: params.bank_id,
      p_borrower_user_id: params.borrower_user_id,
      p_trn_id: params.trn_id || null,
      p_amount: parseFloat(params.amount),
      p_source_type: params.source_type,
      p_source_account_id: params.source_account_id || null,
      p_due_date: params.due_date || null,
      p_notes: params.notes || null,
      p_created_at: params.created_at || null,
    });
    if (error) throw error;
    return data;
  },

  // Return (full or partial) a loan
  async returnLoan(params) {
    const { data, error } = await supabase.rpc('process_loan_return', {
      p_loan_id: params.loan_id,
      p_trn_id: params.trn_id || null,
      p_amount: parseFloat(params.amount),
      p_destination_type: params.destination_type || null,
      p_destination_account_id: params.destination_account_id || null,
      p_notes: params.notes || null,
      p_created_at: params.created_at || null,
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
    if (filters.startDate) query = query.gte('created_at', filters.startDate);
    if (filters.endDate) query = query.lte('created_at', filters.endDate);
    if (filters.search) {
      query = query.or(`trn_id.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
    }
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

      if (filters.search) {
        const s = String(filters.search).toLowerCase();
        const filtered = data.filter((loan) => {
          return (
            String(loan.trn_id || '').toLowerCase().includes(s) ||
            String(loan.notes || '').toLowerCase().includes(s) ||
            String(loan.borrower?.full_name || '').toLowerCase().includes(s) ||
            String(loan.borrower?.email || '').toLowerCase().includes(s)
          );
        });
        return { data: filtered, count: filtered.length };
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

  async getReturnsByDateRange(bankId, startDate, endDate) {
    const { data, error } = await supabase
      .from('loan_returns')
      .select('*')
      .eq('bank_id', bankId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });
    if (error) throw error;

    if (data?.length) {
      const motherIds = [...new Set(data.filter((r) => r.destination_type === 'mother_account' && r.destination_account_id).map((r) => r.destination_account_id))];
      const profitIds = [...new Set(data.filter((r) => r.destination_type === 'profit_account' && r.destination_account_id).map((r) => r.destination_account_id))];

      let motherMap = {};
      let profitMap = {};

      if (motherIds.length) {
        const { data: mothers } = await supabase
          .from('mother_accounts')
          .select('id, name, account_number')
          .in('id', motherIds);
        motherMap = Object.fromEntries((mothers || []).map((m) => [m.id, m]));
      }

      if (profitIds.length) {
        const { data: profits } = await supabase
          .from('profit_accounts')
          .select('id, name')
          .in('id', profitIds);
        profitMap = Object.fromEntries((profits || []).map((p) => [p.id, p]));
      }

      for (const ret of data) {
        if (ret.destination_type === 'hand_cash') {
          ret.destination_label = 'Hand Cash';
        } else if (ret.destination_type === 'mother_account') {
          const ma = motherMap[ret.destination_account_id];
          ret.destination_label = ma ? `${ma.name}${ma.account_number ? ` (${ma.account_number})` : ''}` : 'Mother Account';
        } else if (ret.destination_type === 'profit_account') {
          const pa = profitMap[ret.destination_account_id];
          ret.destination_label = pa?.name || 'Profit Account';
        } else {
          ret.destination_label = '-';
        }
      }
    }

    // Enrich with returned_by profile so callers have the user's name
    const returnedByIds = [...new Set(data.map((r) => r.returned_by).filter(Boolean))];
    if (returnedByIds.length) {
      const { data: returnedProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', returnedByIds);
      const returnedMap = Object.fromEntries((returnedProfiles || []).map((p) => [p.id, p]));
      for (const ret of data) {
        ret.returned_by_profile = returnedMap[ret.returned_by] || null;
      }
    }

    return data || [];
  },

  async getById(loanId) {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();
    if (error) throw error;
    return data;
  },

  async updateLoan(loanId, updates) {
    const payload = {
      due_date: updates.due_date || null,
      notes: updates.notes || null,
      trn_id: updates.trn_id || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('loans')
      .update(payload)
      .eq('id', loanId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
