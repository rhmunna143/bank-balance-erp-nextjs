"use client";

import { useState, useEffect, useCallback } from "react";
import { useMotherAccounts } from "@/hooks/useMotherAccounts";
import { useHandCash } from "@/hooks/useHandCash";
import { useProfitAccounts } from "@/hooks/useProfitAccounts";
import { useBank } from "@/hooks/useBank";
import { CashInForm } from "@/components/forms/CashInForm";
import { TransactionTable } from "@/components/tables/TransactionTable";
import { EditTransactionDialog } from "@/components/transactions/EditTransactionDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatCurrency } from "@/utils/currency";
import {
  ArrowDownToLine,
  Wallet,
  Building2,
  TrendingUp,
  List,
} from "lucide-react";
import toast from "react-hot-toast";
import { transactionService } from "@/services/transactionService";
import { useTransactionStore } from "@/stores/transactionStore";

export default function CashInPage() {
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
  const {
    accounts: profitAccounts,
    loading: paLoading,
    refresh: refreshPA,
  } = useProfitAccounts();
  const { bank, currencySymbol } = useBank();
  const { triggerRefresh, refreshKey } = useTransactionStore();
  const [submitting, setSubmitting] = useState(false);

  // Recent cash-ins
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
        type: "cash_in",
        startDate: `${dateStr}T00:00:00`,
        endDate: `${dateStr}T23:59:59`,
        limit: 50,
        offset: 0,
      });
      setRecentTxns(data || []);
    } catch (e) {
      console.error("Failed to load recent cash-ins", e);
    } finally {
      setLoadingRecent(false);
    }
  }, [bank?.id, refreshKey]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  const handleCashIn = async (data) => {
    setSubmitting(true);
    try {
      await transactionService.processCashIn({
        bank_id: bank.id,
        amount: data.amount,
        target_type: data.target_type,
        target_id: data.target_type === "hand_cash" ? null : data.target_id,
        source: data.source || null,
        reference: data.reference || null,
        notes: data.notes || null,
      });
      toast.success("Cash-in recorded successfully!");
      refreshHC();
      refreshMA();
      refreshPA();
      triggerRefresh();
    } catch (error) {
      toast.error(error.message || "Failed to process cash-in");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (txn) => {
    setEditingTxn(txn);
    setEditOpen(true);
  };

  const handleEditSaved = () => {
    refreshHC();
    refreshMA();
    refreshPA();
    triggerRefresh();
  };

  if (maLoading || hcLoading || paLoading)
    return <LoadingSpinner className="h-64" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cash In</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Fund any account from an external source
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
        {(profitAccounts || []).map((pa) => (
          <Card key={pa.id}>
            <CardContent className="py-4 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {pa.name}
                </p>
                <p className="text-xl font-bold">
                  {formatCurrency(pa.balance, currencySymbol)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5" /> Record Cash In
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CashInForm
            onSubmit={handleCashIn}
            loading={submitting}
            motherAccounts={motherAccounts.filter((a) => a.is_active)}
            profitAccounts={profitAccounts || []}
            handCashId={handCash?.id}
            handCashBalance={handCash?.balance || 0}
          />
        </CardContent>
      </Card>

      {/* Today's Cash-ins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <List className="h-5 w-5" /> Today&apos;s Cash-ins
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
