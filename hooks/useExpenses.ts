import useSWR from 'swr';
import { usePathname } from 'next/navigation';
import * as expenseService from '@/services/expenseService';
import { useBank } from './useBank';
import { useTransactionStore } from '@/stores/transactionStore';
import { useEffect } from 'react';

export function useExpenses(filters: any = {}) {
  const { bankId } = useBank();
  const { refreshKey } = useTransactionStore();
  const pathname = usePathname();

  const filtersKey = JSON.stringify(filters);

  const { data, error, isLoading, mutate } = useSWR(
    bankId ? ['expenses', bankId, filtersKey, refreshKey, pathname] : null,
    async ([, bId]) => {
      const res = await expenseService.getAllExpenses(bId as string, filters);
      return res;
    }
  );

  useEffect(() => {
    if (bankId) {
      mutate();
    }
  }, [refreshKey, pathname, bankId, mutate]);

  return { 
    expenses: data?.data || [], 
    count: data?.count || 0, 
    loading: isLoading, 
    refresh: mutate 
  };
}
