import { supabase } from './supabaseClient';

export const dailyLogService = {
  async generate(bankId, userId) {
    const { data, error } = await supabase.rpc('generate_daily_log', {
      p_bank_id: bankId,
      p_user_id: userId,
    });
    if (error) throw error;
    return data;
  },

  async getSnapshot(bankId, date) {
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const [deposits, withdrawals, cashIns, expenses, handCash] =
      await Promise.all([
        supabase
          .from('transactions')
          .select('amount')
          .eq('bank_id', bankId)
          .eq('type', 'deposit')
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay),
        supabase
          .from('transactions')
          .select('amount')
          .eq('bank_id', bankId)
          .eq('type', 'withdrawal')
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay),
        supabase
          .from('transactions')
          .select('amount')
          .eq('bank_id', bankId)
          .eq('type', 'cash_in')
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay),
        supabase
          .from('expenses')
          .select('amount')
          .eq('bank_id', bankId)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay),
        supabase
          .from('hand_cash_accounts')
          .select('balance')
          .eq('bank_id', bankId)
          .single(),
      ]);

    const sum = (result) =>
      (result.data || []).reduce((acc, item) => acc + parseFloat(item.amount), 0);

    return {
      total_deposits: sum(deposits),
      total_withdrawals: sum(withdrawals),
      total_cash_in: sum(cashIns),
      total_expenses: sum(expenses),
      total_commissions: 0,
      closing_hand_cash: parseFloat(handCash.data?.balance || 0),
    };
  },

  async getByDateRange(bankId, startDate, endDate) {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('bank_id', bankId)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .order('log_date', { ascending: true });
    if (error) throw error;
    return data;
  },

  async getLatest(bankId, limit = 30) {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('bank_id', bankId)
      .order('log_date', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },
};
