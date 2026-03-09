import { useState, useCallback } from 'react';
import { transactionService } from '@/services/transactionService';
import { useBank } from './useBank';
import { useAuth } from './useAuth';
import { useTransactionStore } from '@/stores/transactionStore';

export function useTransactions() {
  const { bankId } = useBank();
  const { user } = useAuth();
  const { triggerRefresh } = useTransactionStore();
  const [loading, setLoading] = useState(false);

  const processDeposit = useCallback(async (formData) => {
    if (!bankId || !user) return;
    setLoading(true);
    try {
      const result = await transactionService.processDeposit({
        bankId,
        motherAccountId: formData.mother_account_id,
        amount: formData.amount,
        customerName: formData.customer_name,
        customerPhone: formData.customer_phone,
        customerAccountNo: formData.customer_account_no,
        description: formData.description,
        performedBy: user.id,
      });
      triggerRefresh();
      return result;
    } finally {
      setLoading(false);
    }
  }, [bankId, user, triggerRefresh]);

  const processWithdrawal = useCallback(async (formData) => {
    if (!bankId || !user) return;
    setLoading(true);
    try {
      const fn = formData.shortage_enabled
        ? transactionService.processWithdrawalWithShortage
        : transactionService.processWithdrawal;
      const result = await fn({
        bankId,
        motherAccountId: formData.mother_account_id,
        amount: formData.amount,
        customerName: formData.customer_name,
        customerPhone: formData.customer_phone,
        customerAccountNo: formData.customer_account_no,
        description: formData.description,
        performedBy: user.id,
      });
      triggerRefresh();
      return result;
    } finally {
      setLoading(false);
    }
  }, [bankId, user, triggerRefresh]);

  const processCashIn = useCallback(async (formData) => {
    if (!bankId || !user) return;
    setLoading(true);
    try {
      const result = await transactionService.processCashIn({
        bankId,
        targetType: formData.target_type,
        targetId: formData.target_id,
        amount: formData.amount,
        source: formData.source,
        description: formData.description,
        performedBy: user.id,
      });
      triggerRefresh();
      return result;
    } finally {
      setLoading(false);
    }
  }, [bankId, user, triggerRefresh]);

  const processExpense = useCallback(async (formData) => {
    if (!bankId || !user) return;
    setLoading(true);
    try {
      const result = await transactionService.processExpense({
        bankId,
        categoryId: formData.category_id,
        amount: formData.amount,
        particulars: formData.particulars,
        deductedFromType: formData.deducted_from_type,
        deductedFromId: formData.deducted_from_id,
        performedBy: user.id,
      });
      triggerRefresh();
      return result;
    } finally {
      setLoading(false);
    }
  }, [bankId, user, triggerRefresh]);

  const getTransactions = useCallback(async (filters = {}) => {
    if (!bankId) return { data: [], count: 0 };
    return transactionService.getTransactions(bankId, filters);
  }, [bankId]);

  const getCashInTransactions = useCallback(async (filters = {}) => {
    if (!bankId) return [];
    return transactionService.getCashInTransactions(bankId, filters);
  }, [bankId]);

  const getExpenses = useCallback(async (filters = {}) => {
    if (!bankId) return [];
    return transactionService.getExpenses(bankId, filters);
  }, [bankId]);

  const getTodaySummary = useCallback(async () => {
    if (!bankId) return null;
    return transactionService.getTodaySummary(bankId);
  }, [bankId]);

  return {
    loading,
    processDeposit,
    processWithdrawal,
    processCashIn,
    processExpense,
    getTransactions,
    getCashInTransactions,
    getExpenses,
    getTodaySummary,
  };
}
