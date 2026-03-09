import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { motherAccountService } from '@/services/motherAccountService';
import { useBank } from './useBank';
import { useTransactionStore } from '@/stores/transactionStore';

export function useMotherAccounts() {
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
    // Only show full loading spinner on initial load
    if (!hasFetched.current) setLoading(true);
    try {
      const data = await motherAccountService.getAll(bankId);
      setAccounts(data);
      hasFetched.current = true;
    } catch (error) {
      console.error('Error fetching mother accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [bankId]);

  // Fetch on mount and bankId change
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Re-fetch silently on route change or refresh trigger
  useEffect(() => {
    if (hasFetched.current) {
      fetchAccounts();
    }
  }, [refreshKey, pathname]);

  const activeAccounts = accounts.filter((a) => a.is_active);

  return {
    accounts,
    activeAccounts,
    loading,
    refresh: fetchAccounts,
    create: async (account) => {
      const created = await motherAccountService.create({ ...account, bank_id: bankId });
      await fetchAccounts();
      return created;
    },
    update: async (id, updates) => {
      const updated = await motherAccountService.update(id, updates);
      await fetchAccounts();
      return updated;
    },
    toggleActive: async (id, isActive) => {
      await motherAccountService.toggleActive(id, isActive);
      await fetchAccounts();
    },
  };
}
