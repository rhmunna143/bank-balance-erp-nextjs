import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { handCashService } from '@/services/handCashService';
import { useBank } from './useBank';
import { useTransactionStore } from '@/stores/transactionStore';

export function useHandCash() {
  const { bankId } = useBank();
  const { refreshKey } = useTransactionStore();
  const pathname = usePathname();
  const [handCash, setHandCash] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  const fetch = useCallback(async () => {
    if (!bankId) {
      setLoading(false);
      return;
    }
    if (!hasFetched.current) setLoading(true);
    try {
      const data = await handCashService.get(bankId);
      setHandCash(data);
      hasFetched.current = true;
    } catch (error) {
      console.error('Error fetching hand cash:', error);
    } finally {
      setLoading(false);
    }
  }, [bankId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    if (hasFetched.current) {
      fetch();
    }
  }, [refreshKey, pathname]);

  return {
    handCash,
    balance: handCash?.balance || 0,
    loading,
    refresh: fetch,
    updateThreshold: async (threshold) => {
      await handCashService.updateThreshold(bankId, threshold);
      await fetch();
    },
    updateBalance: async (newBalance) => {
      await handCashService.updateBalance(bankId, newBalance);
      await fetch();
    },
  };
}
