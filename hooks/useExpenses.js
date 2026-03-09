import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { expenseService } from '@/services/expenseService';
import { useBank } from './useBank';
import { useTransactionStore } from '@/stores/transactionStore';

export function useExpenses(filters = {}) {
  const { bankId } = useBank();
  const { refreshKey } = useTransactionStore();
  const pathname = usePathname();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);
  const filtersKey = JSON.stringify(filters);

  const fetchExpenses = useCallback(async () => {
    if (!bankId) { setLoading(false); return; }
    if (!hasFetched.current) setLoading(true);
    try {
      const data = await expenseService.getAll(bankId, filters);
      setExpenses(data);
      hasFetched.current = true;
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [bankId, filtersKey]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    if (hasFetched.current) {
      fetchExpenses();
    }
  }, [refreshKey, pathname]);

  return { expenses, loading, refresh: fetchExpenses };
}
