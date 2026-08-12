"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useBank } from "@/hooks/useBank";
import { useMotherAccounts } from "@/hooks/useMotherAccounts";
import { useProfitAccounts } from "@/hooks/useProfitAccounts";
import { useHandCash } from "@/hooks/useHandCash";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { FundTransferForm } from "@/components/forms/FundTransferForm";
import { TransactionTable } from "@/components/tables/TransactionTable";
import * as transactionService from "@/services/transactionService";
import { useTransactionStore } from "@/stores/transactionStore";

export default function FundTransferPage() {
  const { bank } = useBank();
  const { accounts: motherAccounts, refresh: refreshMA } = useMotherAccounts();
  const { accounts: profitAccounts, refresh: refreshPA } = useProfitAccounts();
  const { refresh: refreshHC } = useHandCash();
  const { refreshKey, triggerRefresh } = useTransactionStore();

  const [loading, setLoading] = useState(true);
  const [transfering, setTransfering] = useState(false);
  const [transfers, setTransfers] = useState([]);

  const fetchTransfers = useCallback(async () => {
    if (!bank?.id) return;
    setLoading(true);
    try {
      const { data } = await transactionService.getTransactions(bank.id, {
        type: "fund_transfer",
        limit: 20,
        offset: 0,
      });
      setTransfers(data || []);
    } catch (error) {
      toast.error(error.message || "Failed to load fund transfers");
    } finally {
      setLoading(false);
    }
  }, [bank?.id]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers, refreshKey]);

  const handleTransfer = async (data) => {
    if (!bank?.id) return;
    setTransfering(true);
    try {
      await transactionService.processFundTransfer({
        bank_id: bank.id,
        trn_id: data.trn_id || null,
        amount: data.amount,
        source_type: data.source_type,
        source_account_id: data.source_type === "hand_cash" ? null : data.source_account_id,
        destination_type: data.destination_type,
        destination_account_id:
          data.destination_type === "hand_cash" || data.destination_type === "external_holder"
            ? null
            : data.destination_account_id,
        destination_name: data.destination_name || null,
        destination_account: data.destination_account || null,
        notes: data.notes || null,
        created_at: data.created_at ? `${data.created_at}T12:00:00` : null,
      });

      toast.success("Fund transfer recorded");
      refreshMA();
      refreshHC();
      refreshPA();
      triggerRefresh();
      fetchTransfers();
    } catch (error) {
      toast.error(error.message || "Failed to process transfer");
    } finally {
      setTransfering(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fund Transfer</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Transfer funds between internal accounts or to an external account holder.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Transfer</CardTitle>
        </CardHeader>
        <CardContent>
          <FundTransferForm
            motherAccounts={(motherAccounts || []).filter((a) => a.is_active)}
            profitAccounts={profitAccounts || []}
            loading={transfering}
            onSubmit={handleTransfer}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner className="h-40" />
          ) : transfers.length === 0 ? (
            <EmptyState
              icon={ArrowRightLeft}
              title="No Transfers Yet"
              description="Your recorded fund transfers will appear here."
            />
          ) : (
            <TransactionTable
              transactions={transfers}
              onReverse={async (txn) => {
                const reason = window.prompt("Reverse reason");
                if (reason === null) return;
                try {
                  await transactionService.reverseTransaction({
                    txn_id: txn.id,
                    reason: reason || null,
                  });
                  toast.success("Transfer reversed");
                  refreshMA();
                  refreshHC();
                  refreshPA();
                  triggerRefresh();
                  fetchTransfers();
                } catch (error) {
                  toast.error(error.message || "Failed to reverse transfer");
                }
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
