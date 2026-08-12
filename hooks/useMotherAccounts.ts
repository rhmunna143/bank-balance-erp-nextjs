import useSWR from 'swr';
import { getMotherAccounts, getActiveMotherAccounts, createMotherAccount, updateMotherAccountBalance, toggleMotherAccountActive, updateMotherAccount } from '@/services/motherAccountService';
import { Prisma } from '@prisma/client';

import { useBankStore } from '@/stores/bankStore';

export function useMotherAccounts(providedBankId?: string) {
  const storeBankId = useBankStore((state: any) => state.bank?.id);
  const bankId = providedBankId || storeBankId;
  const { data, error, mutate, isLoading } = useSWR(
    bankId ? `mother-accounts-${bankId}` : null,
    () => getMotherAccounts(bankId)
  );

  const activeAccounts = data?.filter((a: any) => a.isActive) || [];

  return {
    accounts: data || [],
    activeAccounts,
    loading: isLoading,
    error,
    createAccount: async (accountData: Prisma.MotherAccountUncheckedCreateInput) => {
      const created = await createMotherAccount({ ...accountData, bankId });
      mutate();
      return created;
    },
    updateAccount: async (id: string, updates: Prisma.MotherAccountUpdateInput) => {
      await updateMotherAccount(id, updates);
      mutate();
    },
    updateBalance: async (id: string, newBalance: number) => {
      await updateMotherAccountBalance(id, newBalance);
      mutate();
    },
    toggleActive: async (id: string, isActive: boolean) => {
      await toggleMotherAccountActive(id, isActive);
      mutate();
    },
    refresh: mutate
  };
}
