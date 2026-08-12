import useSWR from 'swr';
import { getProfitAccounts, createProfitAccount, updateProfitAccountBalance, updateProfitAccount } from '@/services/profitAccountService';
import { Prisma } from '@prisma/client';

import { useBankStore } from '@/stores/bankStore';

export function useProfitAccounts(providedBankId?: string) {
  const storeBankId = useBankStore((state: any) => state.bank?.id);
  const bankId = providedBankId || storeBankId;
  const { data, error, mutate, isLoading } = useSWR(
    bankId ? `profit-accounts-${bankId}` : null,
    () => getProfitAccounts(bankId)
  );

  return {
    accounts: data || [],
    loading: isLoading,
    error,
    createAccount: async (accountData: Prisma.ProfitAccountUncheckedCreateInput) => {
      const created = await createProfitAccount({ ...accountData, bankId });
      mutate();
      return created;
    },
    updateAccount: async (id: string, updates: Prisma.ProfitAccountUpdateInput) => {
      await updateProfitAccount(id, updates);
      mutate();
    },
    updateBalance: async (id: string, newBalance: number) => {
      await updateProfitAccountBalance(id, newBalance);
      mutate();
    },
    refresh: mutate
  };
}
