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
import { transactionService } from "@/services/transactionService";
import { useTransactionStore } from "@/stores/transactionStore";
import { formatCurrency } from "@/utils/currency";
import { TRANSACTION_TYPES, ITEMS_PER_PAGE } from "@/utils/constants";
import { List, Search, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

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
  const { refresh: refreshMA } = useMotherAccounts();
  const { refresh: refreshHC } = useHandCash();
  const { refresh: refreshPA } = useProfitAccounts();
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
                placeholder="Search customer..."
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
    </div>
  );
}
