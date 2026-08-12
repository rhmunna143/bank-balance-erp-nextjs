import useSWR from 'swr';
import { getHandCash, updateHandCashBalance, updateHandCashThreshold } from '@/services/handCashService';

import { useBankStore } from '@/stores/bankStore';

export function useHandCash(providedBankId?: string) {
  const storeBankId = useBankStore((state: any) => state.bank?.id);
  const bankId = providedBankId || storeBankId;
  const { data, error, mutate, isLoading } = useSWR(
    bankId ? `handcash-${bankId}` : null,
    () => getHandCash(bankId)
  );

  return {
    handCash: data,
    loading: isLoading,
    error,
    updateBalance: async (balance: number) => {
      await updateHandCashBalance(bankId, balance);
      mutate();
    },
    updateThreshold: async (threshold: number) => {
      await updateHandCashThreshold(bankId, threshold);
      mutate();
    },
    refresh: mutate
  };
}
