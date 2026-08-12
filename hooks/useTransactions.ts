import { useState, useCallback } from 'react';
import * as transactionService from '@/services/transactionService';
import { useBank } from './useBank';
import { useAuth } from './useAuth';
import { useTransactionStore } from '@/stores/transactionStore';
import useSWR from 'swr';

export function useTransactions() {
  const { bankId } = useBank();
  const { user } = useAuth();
  const { triggerRefresh } = useTransactionStore();
  const [loading, setLoading] = useState(false);

  const processDeposit = useCallback(async (formData: any) => {
    if (!bankId || !user) return;
    setLoading(true);
    try {
      const result = await transactionService.processDeposit({
        bank_id: bankId,
        mother_account_id: formData.mother_account_id,
        amount: formData.amount,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_account: formData.customer_account_no,
        description: formData.description,
      });
      triggerRefresh();
      return result;
    } finally {
      setLoading(false);
    }
  }, [bankId, user, triggerRefresh]);

  const processWithdrawal = useCallback(async (formData: any) => {
    if (!bankId || !user) return;
    setLoading(true);
    try {
      const fn = formData.shortage_enabled
        ? transactionService.processWithdrawalWithShortage
        : transactionService.processWithdrawal;
      const result = await fn({
        bank_id: bankId,
        mother_account_id: formData.mother_account_id,
        amount: formData.amount,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_account: formData.customer_account_no,
        description: formData.description,
        shortage_amount: formData.shortage_amount,
      });
      triggerRefresh();
      return result;
    } finally {
      setLoading(false);
    }
  }, [bankId, user, triggerRefresh]);

  const processCashIn = useCallback(async (formData: any) => {
    if (!bankId || !user) return;
    setLoading(true);
    try {
      const result = await transactionService.processCashIn({
        bank_id: bankId,
        target_type: formData.target_type,
        target_id: formData.target_id,
        amount: formData.amount,
        source: formData.source,
        description: formData.description,
      });
      triggerRefresh();
      return result;
    } finally {
      setLoading(false);
    }
  }, [bankId, user, triggerRefresh]);

  const processExpense = useCallback(async (formData: any) => {
    if (!bankId || !user) return;
    setLoading(true);
    try {
      const result = await transactionService.processExpense({
        bank_id: bankId,
        category_id: formData.category_id,
        amount: formData.amount,
        particulars: formData.particulars,
        deduct_from: formData.deducted_from_type,
        profit_account_id: formData.deducted_from_id, // Might need mapping depending on deduct_from
      });
      triggerRefresh();
      return result;
    } finally {
      setLoading(false);
    }
  }, [bankId, user, triggerRefresh]);

  const getTransactions = useCallback(async (filters: any = {}) => {
    if (!bankId) return { data: [], count: 0 };
    return transactionService.getTransactions(bankId, filters);
  }, [bankId]);

  const getCashInTransactions = useCallback(async (filters: any = {}) => {
    if (!bankId) return [];
    return transactionService.getCashInTransactions(bankId, filters);
  }, [bankId]);

  const getExpenses = useCallback(async (filters: any = {}) => {
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
