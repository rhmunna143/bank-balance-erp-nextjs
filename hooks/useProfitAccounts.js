import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { profitAccountService } from '@/services/profitAccountService';
import { useBank } from './useBank';
import { useTransactionStore } from '@/stores/transactionStore';

export function useProfitAccounts() {
  const { bankId } = useBank();
  const { refreshKey } = useTransactionStore();
  const pathname = usePathname();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  const fetchAccounts = useCallback(async () => {
    if (!bankId) {
      setLoading(false);
      return;
    }
    if (!hasFetched.current) setLoading(true);
    try {
      const data = await profitAccountService.getAll(bankId);
      setAccounts(data);
      hasFetched.current = true;
    } catch (error) {
      console.error('Error fetching profit accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [bankId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (hasFetched.current) {
      fetchAccounts();
    }
  }, [refreshKey, pathname]);

  return {
    accounts,
    loading,
    refresh: fetchAccounts,
    create: async (account) => {
      const created = await profitAccountService.create({ ...account, bank_id: bankId });
      await fetchAccounts();
      return created;
    },
    update: async (id, updates) => {
      const updated = await profitAccountService.update(id, updates);
      await fetchAccounts();
      return updated;
    },
  };
}
