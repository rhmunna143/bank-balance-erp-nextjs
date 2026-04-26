"use client";

import { useState, useEffect, useCallback } from "react";
import { useBank } from "@/hooks/useBank";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { ExpenseTable } from "@/components/tables/ExpenseTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { DateRangePicker } from "@/components/common/DateRangePicker";
import { expenseService } from "@/services/expenseService";
import { transactionService } from "@/services/transactionService";
import { useTransactionStore } from "@/stores/transactionStore";
import { useHandCash } from "@/hooks/useHandCash";
import { useMotherAccounts } from "@/hooks/useMotherAccounts";
import { useProfitAccounts } from "@/hooks/useProfitAccounts";
import { ITEMS_PER_PAGE } from "@/utils/constants";
import { Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import { EditExpenseDialog } from "@/components/transactions/EditExpenseDialog";
import toast from "react-hot-toast";

function getThreeMonthsAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function ExpensesPage() {
  const { bank, currencySymbol, categories } = useBank();
  const { triggerRefresh } = useTransactionStore();
  const { handCash, refresh: refreshHC } = useHandCash();
  const { accounts: motherAccounts, refresh: refreshMA } = useMotherAccounts();
  const { accounts: profitAccounts, refresh: refreshPA } = useProfitAccounts();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [startDate, setStartDate] = useState(getThreeMonthsAgo());
  const [endDate, setEndDate] = useState(getToday());

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const fetchExpenses = useCallback(async () => {
    if (!bank?.id) return;
    setLoading(true);
    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const filters = {
        limit: ITEMS_PER_PAGE,
        offset,
      };
      if (categoryFilter) filters.categoryId = categoryFilter;
      if (startDate) filters.startDate = `${startDate}T00:00:00`;
      if (endDate) filters.endDate = `${endDate}T23:59:59`;

      const { data, count } = await expenseService.getAll(bank.id, filters);
      setExpenses(data || []);
      setTotal(count || 0);
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
    } finally {
      setLoading(false);
    }
  }, [bank?.id, page, categoryFilter, startDate, endDate]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleRecordExpense = async (data) => {
    setSubmitting(true);
    try {
      await transactionService.processExpense({
        bank_id: bank.id,
        trn_id: data.trn_id || null,
        amount: data.amount,
        category_id: data.category_id,
        deduct_from: data.deducted_from_type,
        mother_account_id:
          data.deducted_from_type === "mother_account"
            ? data.deducted_from_id
            : null,
        profit_account_id:
          data.deducted_from_type === "profit_account"
            ? data.deducted_from_id
            : null,
        description: data.particulars || null,
        receipt_url: null,
        created_at: data.created_at ? `${data.created_at}T12:00:00` : null,
      });
      toast.success("Expense recorded!");
      fetchExpenses();
      refreshHC();
      refreshMA();
      refreshPA();
      triggerRefresh();
    } catch (error) {
      toast.error(error.message || "Failed to record expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (expense) => {
    setEditingExpense(expense);
    setEditOpen(true);
  };

  const handleEditSaved = () => {
    fetchExpenses();
    refreshHC();
    refreshMA();
    refreshPA();
    triggerRefresh();
  };

  const handleReverseExpense = async (expense) => {
    const reason = window.prompt("Reverse reason");
    if (reason === null) return;

    try {
      await expenseService.reverseExpense({
        expense_id: expense.id,
        reason: reason || null,
      });
      toast.success("Expense reversed");
      fetchExpenses();
      refreshHC();
      refreshMA();
      refreshPA();
      triggerRefresh();
    } catch (error) {
      toast.error(error.message || "Failed to reverse expense");
    }
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Expenses</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Record and track operational expenses
        </p>
      </div>

      {/* Record Expense Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Record New Expense
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm
            onSubmit={handleRecordExpense}
            loading={submitting}
            categories={categories}
            motherAccounts={motherAccounts}
            profitAccounts={profitAccounts}
            handCashId={handCash?.id}
          />
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <Select
              value={categoryFilter}
              onValueChange={(val) => {
                setCategoryFilter(val === "all" ? "" : val);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePicker
              className="md:col-span-2"
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={(val) => {
                setStartDate(val);
                setPage(1);
              }}
              onEndDateChange={(val) => {
                setEndDate(val);
                setPage(1);
              }}
            />
            <Button
              variant="outline"
              onClick={() => {
                setCategoryFilter("");
                setStartDate(getThreeMonthsAgo());
                setEndDate(getToday());
                setPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expense List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {total} Expense{total !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner className="h-48" />
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No Expenses Found"
              description="No expenses match your current filters."
            />
          ) : (
            <>
              <ExpenseTable
                expenses={expenses}
                currencySymbol={currencySymbol}
                onEdit={handleEditClick}
                onReverse={handleReverseExpense}
              />

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

      <EditExpenseDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        expense={editingExpense}
        categories={categories}
        onSaved={handleEditSaved}
      />
    </div>
  );
}
