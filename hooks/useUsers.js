import { useState, useEffect, useCallback } from 'react';
import { userService } from '@/services/userService';
import { useBank } from './useBank';

export function useUsers() {
  const { bankId } = useBank();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!bankId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await userService.getMembers(bankId);
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  }, [bankId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    users,
    loading,
    refresh: fetchMembers,
    invite: async (email, role) => {
      await userService.inviteUser(bankId, email, role);
      await fetchMembers();
    },
    removeMember: async (memberId) => {
      await userService.removeMember(memberId);
      await fetchMembers();
    },
    updateRole: async (memberId, role) => {
      await userService.updateRole(memberId, role);
      await fetchMembers();
    },
  };
}
