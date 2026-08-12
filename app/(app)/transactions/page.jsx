"use client";

import { useState, useEffect, useCallback } from "react";
import { useBank } from "@/hooks/useBank";
import { useMotherAccounts } from "@/hooks/useMotherAccounts";
import { useHandCash } from "@/hooks/useHandCash";
import { useProfitAccounts } from "@/hooks/useProfitAccounts";
import { TransactionTable } from "@/components/tables/TransactionTable";
import { EditTransactionDialog } from "@/components/transactions/EditTransactionDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { DateRangePicker } from "@/components/common/DateRangePicker";
import { FundTransferForm } from "@/components/forms/FundTransferForm";
import * as transactionService from "@/services/transactionService";
import { useTransactionStore } from "@/stores/transactionStore";
import { formatCurrency } from "@/utils/currency";
import { TRANSACTION_TYPES, ITEMS_PER_PAGE } from "@/utils/constants";
import { List, Search, ChevronLeft, ChevronRight, ArrowRightLeft } from "lucide-react";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

function getTodayRange() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;
  return { start: `${dateStr}T00:00:00`, end: `${dateStr}T23:59:59` };
}

export default function TransactionHistoryPage() {
  const { bank, currencySymbol } = useBank();
  const { accounts: motherAccounts, refresh: refreshMA } = useMotherAccounts();
  const { accounts: profitAccounts, refresh: refreshPA } = useProfitAccounts();
  const { refresh: refreshHC } = useHandCash();
  const { refreshKey, triggerRefresh } = useTransactionStore();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const todayRange = getTodayRange();
  const todayDate = todayRange.start.slice(0, 10);

  const [filters, setFilters] = useState({
    search: "",
    type: "",
    startDate: todayDate,
    endDate: todayDate,
  });

  // Edit transaction state
  const [editOpen, setEditOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transfering, setTransfering] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!bank?.id) return;
    setLoading(true);
    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const queryFilters = {
        limit: ITEMS_PER_PAGE,
        offset,
        type: filters.type || undefined,
        search: filters.search || undefined,
      };
      if (filters.startDate) {
        queryFilters.startDate = `${filters.startDate}T00:00:00`;
      }
      if (filters.endDate) {
        queryFilters.endDate = `${filters.endDate}T23:59:59`;
      }
      const { data, count } = await transactionService.getTransactions(
        bank.id,
        queryFilters
      );
      setTransactions(data || []);
      setTotal(count || 0);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  }, [bank?.id, page, filters, refreshKey]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      type: "",
      startDate: todayDate,
      endDate: todayDate,
    });
    setPage(1);
  };

  const handleEditClick = (txn) => {
    setEditingTxn(txn);
    setEditOpen(true);
  };

  const handleEditSaved = () => {
    refreshMA();
    refreshHC();
    refreshPA();
    triggerRefresh();
    fetchTransactions();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          View all deposits, withdrawals, and cash-in records
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
              <Input
                placeholder="Global search: TRN ID, name, account no, notes"
                className="pl-9"
                value={filters.search}
                onChange={(e) =>
                  handleFilterChange("search", e.target.value)
                }
              />
            </div>
            <Select
              value={filters.type}
              onValueChange={(val) =>
                handleFilterChange("type", val === "all" ? "" : val)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(TRANSACTION_TYPES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePicker
              className="md:col-span-2"
              startDate={filters.startDate}
              endDate={filters.endDate}
              onStartDateChange={(val) =>
                handleFilterChange("startDate", val)
              }
              onEndDateChange={(val) =>
                handleFilterChange("endDate", val)
              }
            />
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
            <Button onClick={() => setTransferOpen(true)}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Fund Transfer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {total} Transaction{total !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner className="h-48" />
          ) : transactions.length === 0 ? (
            <EmptyState
              icon={List}
              title="No Transactions Found"
              description="No transactions match your current filters."
            />
          ) : (
            <>
              <TransactionTable
                transactions={transactions}
                currencySymbol={currencySymbol}
                onEdit={handleEditClick}
                onReverse={async (txn) => {
                  const reason = window.prompt("Reverse reason");
                  if (reason === null) return;
                  try {
                    await transactionService.reverseTransaction({
                      txn_id: txn.id,
                      reason: reason || null,
                    });
                    toast.success("Transaction reversed");
                    refreshMA();
                    refreshHC();
                    refreshPA();
                    triggerRefresh();
                    fetchTransactions();
                  } catch (error) {
                    toast.error(error.message || "Failed to reverse transaction");
                  }
                }}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-border)]">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.max(1, p - 1))
                      }
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Transaction Dialog */}
      <EditTransactionDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        transaction={editingTxn}
        onSaved={handleEditSaved}
      />

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fund Transfer</DialogTitle>
            <DialogDescription>
              Transfer funds internally between accounts or to an external account holder.
            </DialogDescription>
          </DialogHeader>
          <FundTransferForm
            motherAccounts={(motherAccounts || []).filter((a) => a.is_active)}
            profitAccounts={profitAccounts || []}
            loading={transfering}
            onSubmit={async (data) => {
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
                setTransferOpen(false);
                refreshMA();
                refreshHC();
                refreshPA();
                triggerRefresh();
                fetchTransactions();
              } catch (error) {
                toast.error(error.message || "Failed to process transfer");
              } finally {
                setTransfering(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
