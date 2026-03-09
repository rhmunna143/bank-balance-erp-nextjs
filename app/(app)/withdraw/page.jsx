"use client";

import { useState, useEffect, useCallback } from "react";
import { useMotherAccounts } from "@/hooks/useMotherAccounts";
import { useHandCash } from "@/hooks/useHandCash";
import { useBank } from "@/hooks/useBank";
import { WithdrawForm } from "@/components/forms/WithdrawForm";
import { TransactionTable } from "@/components/tables/TransactionTable";
import { EditTransactionDialog } from "@/components/transactions/EditTransactionDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatCurrency } from "@/utils/currency";
import { ArrowDownRight, Wallet, Building2, List } from "lucide-react";
import toast from "react-hot-toast";
import { transactionService } from "@/services/transactionService";
import { useTransactionStore } from "@/stores/transactionStore";

export default function WithdrawPage() {
  const {
    accounts: motherAccounts,
    loading: maLoading,
    refresh: refreshMA,
  } = useMotherAccounts();
  const {
    handCash,
    loading: hcLoading,
    refresh: refreshHC,
  } = useHandCash();
  const { bank, currencySymbol } = useBank();
  const { triggerRefresh, refreshKey } = useTransactionStore();
  const [submitting, setSubmitting] = useState(false);

  // Recent withdrawals
  const [recentTxns, setRecentTxns] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);

  const fetchRecent = useCallback(async () => {
    if (!bank?.id) return;
    setLoadingRecent(true);
    try {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10);
      const { data } = await transactionService.getTransactions(bank.id, {
        type: "withdrawal",
        startDate: `${dateStr}T00:00:00`,
        endDate: `${dateStr}T23:59:59`,
        limit: 50,
        offset: 0,
      });
      setRecentTxns(data || []);
    } catch (e) {
      console.error("Failed to load recent withdrawals", e);
    } finally {
      setLoadingRecent(false);
    }
  }, [bank?.id, refreshKey]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  const handleWithdraw = async (data) => {
    setSubmitting(true);
    try {
      const deductionAmount = data.shortage_enabled
        ? parseFloat(data.shortage_deduction_amount || 0)
        : 0;
      if (data.shortage_enabled && deductionAmount > 0) {
        await transactionService.processWithdrawalWithShortage({
          bank_id: bank.id,
          customer_name: data.customer_name,
          customer_account: data.customer_account_no || null,
          amount: data.amount,
          commission: 0,
          mother_account_id:
            data.shortage_mother_account_id || data.mother_account_id,
          shortage_amount: deductionAmount,
          notes: data.description || null,
        });
      } else {
        await transactionService.processWithdrawal({
          bank_id: bank.id,
          customer_name: data.customer_name,
          customer_account: data.customer_account_no || null,
          amount: data.amount,
          commission: 0,
          mother_account_id: data.mother_account_id,
          notes: data.description || null,
        });
      }
      toast.success("Withdrawal recorded successfully!");
      refreshMA();
      refreshHC();
      triggerRefresh();
    } catch (error) {
      toast.error(error.message || "Failed to process withdrawal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (txn) => {
    setEditingTxn(txn);
    setEditOpen(true);
  };

  const handleEditSaved = () => {
    refreshMA();
    refreshHC();
    triggerRefresh();
  };

  if (maLoading || hcLoading) return <LoadingSpinner className="h-64" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customer Withdrawal</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Record a customer withdrawal from mother account
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 flex items-center gap-3">
            <Wallet className="h-8 w-8 text-[var(--color-primary)]" />
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Hand Cash
              </p>
              <p className="text-xl font-bold">
                {formatCurrency(handCash?.balance || 0, currencySymbol)}
              </p>
            </div>
          </CardContent>
        </Card>
        {motherAccounts
          .filter((a) => a.is_active)
          .map((ma) => (
            <Card key={ma.id}>
              <CardContent className="py-4 flex items-center gap-3">
                <Building2 className="h-8 w-8 text-[var(--color-accent)]" />
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {ma.name}
                  </p>
                  <p className="text-xl font-bold">
                    {formatCurrency(ma.balance, currencySymbol)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownRight className="h-5 w-5" /> Record Withdrawal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WithdrawForm
            onSubmit={handleWithdraw}
            loading={submitting}
            motherAccounts={motherAccounts.filter((a) => a.is_active)}
            handCashBalance={handCash?.balance || 0}
            currencySymbol={currencySymbol}
          />
        </CardContent>
      </Card>

      {/* Today's Withdrawals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <List className="h-5 w-5" /> Today&apos;s Withdrawals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecent ? (
            <LoadingSpinner className="h-24" />
          ) : (
            <TransactionTable
              transactions={recentTxns}
              currencySymbol={currencySymbol}
              onEdit={handleEditClick}
            />
          )}
        </CardContent>
      </Card>

      <EditTransactionDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        transaction={editingTxn}
        onSaved={handleEditSaved}
      />
    </div>
  );
}
