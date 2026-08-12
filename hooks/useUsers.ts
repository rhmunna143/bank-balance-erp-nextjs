import useSWR from 'swr';
import * as userService from '@/services/userService';
import { useBank } from './useBank';

export function useUsers() {
  const { bankId } = useBank();

  const { data, error, isLoading, mutate } = useSWR(
    bankId ? ['users', bankId] : null,
    async ([, bId]) => {
      const res = await userService.getMembers(bId as string);
      return res;
    }
  );

  return {
    users: data || [],
    loading: isLoading,
    refresh: mutate,
    invite: async (email: string, role: string) => {
      if (bankId) {
        await userService.inviteUser(bankId, email, role);
        await mutate();
      }
    },
    removeMember: async (memberId: string) => {
      await userService.removeMember(memberId);
      await mutate();
    },
    updateRole: async (memberId: string, role: string) => {
      await userService.updateRole(memberId, role);
      await mutate();
    },
  };
}
