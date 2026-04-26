"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useBank } from "@/hooks/useBank";
import { transactionService } from "@/services/transactionService";
import { expenseService } from "@/services/expenseService";
import { loanService } from "@/services/loanService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Search } from "lucide-react";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function inText(value, q) {
  return String(value || "").toLowerCase().includes(String(q || "").toLowerCase());
}

export default function GlobalSearchPage() {
  const { bank, bankSlug } = useBank();
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const filtersSummary = useMemo(
    () => [
      moduleFilter === "all" ? "All modules" : moduleFilter,
      typeFilter === "all" ? "All types" : typeFilter,
      `${startDate} to ${endDate}`,
    ].join(" • "),
    [moduleFilter, typeFilter, startDate, endDate]
  );

  const runSearch = async () => {
    if (!bank?.id) return;
    setLoading(true);
    try {
      const startISO = `${startDate}T00:00:00`;
      const endISO = `${endDate}T23:59:59`;
      const normalizedQuery = query.trim();

      const wantsTransactions = moduleFilter === "all" || moduleFilter === "transactions";
      const wantsExpenses = moduleFilter === "all" || moduleFilter === "expenses";
      const wantsLoans = moduleFilter === "all" || moduleFilter === "loans";

      const [txnRes, expRes, loanRes] = await Promise.all([
        wantsTransactions
          ? transactionService.getTransactions(bank.id, {
              limit: 300,
              offset: 0,
              startDate: startISO,
              endDate: endISO,
              search: normalizedQuery || undefined,
            })
          : Promise.resolve({ data: [] }),
        wantsExpenses
          ? expenseService.getAll(bank.id, {
              limit: 300,
              offset: 0,
              startDate: startISO,
              endDate: endISO,
            })
          : Promise.resolve({ data: [] }),
        wantsLoans
          ? loanService.getAll(bank.id, {
              limit: 300,
              offset: 0,
              startDate: startISO,
              endDate: endISO,
              search: normalizedQuery || undefined,
            })
          : Promise.resolve({ data: [] }),
      ]);

      const txns = (txnRes.data || []).map((t) => ({
        id: `txn-${t.id}`,
        module: "transactions",
        recordId: t.id,
        trn_id: t.trn_id,
        date: t.created_at,
        type: t.type,
        name: t.customer_name || t.destination_name || "-",
        account: t.customer_account || t.destination_account || "-",
        amount: t.amount,
        notes: t.notes,
        is_reversed: t.is_reversed,
        reversed_at: t.reversed_at,
        reversal_reason: t.reversal_reason,
        reversed_by: t.reversed_by_profile?.full_name || t.reversed_by_profile?.email,
      }));

      const expenses = (expRes.data || [])
        .filter((e) => {
          if (!normalizedQuery) return true;
          return (
            inText(e.trn_id, normalizedQuery) ||
            inText(e.description, normalizedQuery) ||
            inText(e.expense_categories?.name, normalizedQuery) ||
            inText(e.mother_accounts?.name, normalizedQuery) ||
            inText(e.mother_accounts?.account_number, normalizedQuery) ||
            inText(e.profit_accounts?.name, normalizedQuery)
          );
        })
        .map((e) => ({
          id: `exp-${e.id}`,
          module: "expenses",
          recordId: e.id,
          trn_id: e.trn_id,
          date: e.created_at,
          type: e.deduct_from,
          name: e.expense_categories?.name || "Expense",
          account: e.mother_accounts?.account_number || e.mother_accounts?.name || e.profit_accounts?.name || "-",
          amount: e.amount,
          notes: e.description,
          is_reversed: e.is_reversed,
          reversed_at: e.reversed_at,
          reversal_reason: e.reversal_reason,
          reversed_by: e.reversed_by_profile?.full_name || e.reversed_by_profile?.email,
        }));

      const loans = (loanRes.data || []).map((l) => ({
        id: `loan-${l.id}`,
        module: "loans",
        recordId: l.id,
        trn_id: l.trn_id,
        date: l.created_at,
        type: l.status,
        name: l.borrower?.full_name || l.borrower?.email || "-",
        account: l.borrower?.email || "-",
        amount: l.amount,
        notes: l.notes,
      }));

      let merged = [...txns, ...expenses, ...loans];

      if (typeFilter !== "all") {
        merged = merged.filter((r) => r.type === typeFilter);
      }

      merged.sort((a, b) => new Date(b.date) - new Date(a.date));
      setResults(merged);
    } finally {
      setLoading(false);
    }
  };

  const base = bankSlug ? `/${bankSlug}` : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Global Search</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Search across transactions, expenses, and loans by TRN ID, name, account number, and date filters.
        </p>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
              <Input
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="TRN ID / name / account number / notes"
              />
            </div>

            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger><SelectValue placeholder="Module" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="transactions">Transactions</SelectItem>
                <SelectItem value="expenses">Expenses</SelectItem>
                <SelectItem value="loans">Loans</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="withdrawal">Withdrawal</SelectItem>
                <SelectItem value="cash_in">Cash In</SelectItem>
                <SelectItem value="fund_transfer">Fund Transfer</SelectItem>
                <SelectItem value="active">Loan Active</SelectItem>
                <SelectItem value="partially_returned">Loan Partially Returned</SelectItem>
                <SelectItem value="returned">Loan Returned</SelectItem>
              </SelectContent>
            </Select>

            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

            <Button onClick={runSearch} className="md:col-span-2 lg:col-span-1" disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Results ({results.length})</CardTitle>
          <p className="text-xs text-[var(--color-text-muted)]">{filtersSummary}</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner className="h-40" />
          ) : results.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 px-3">Date</th>
                    <th className="text-left py-2 px-3">Module</th>
                    <th className="text-left py-2 px-3">TRN ID</th>
                    <th className="text-left py-2 px-3">Type/Status</th>
                    <th className="text-left py-2 px-3">Name</th>
                    <th className="text-left py-2 px-3">Account</th>
                    <th className="text-left py-2 px-3">Notes</th>
                    <th className="text-right py-2 px-3">Amount</th>
                    <th className="text-right py-2 px-3">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--color-border)] align-top">
                      <td className="py-2 px-3 whitespace-nowrap">{new Date(row.date).toLocaleString()}</td>
                      <td className="py-2 px-3 capitalize">{row.module}</td>
                      <td className="py-2 px-3">{row.trn_id || "-"}</td>
                      <td className="py-2 px-3 capitalize">{String(row.type || "-").replaceAll("_", " ")}</td>
                      <td className="py-2 px-3">{row.name || "-"}</td>
                      <td className="py-2 px-3">{row.account || "-"}</td>
                      <td className="py-2 px-3 max-w-[280px]">
                        <p className="truncate">{row.notes || "-"}</p>
                        {(row.module === "transactions" || row.module === "expenses") && row.is_reversed && (
                          <div className="text-xs text-danger mt-1 space-y-0.5">
                            <p>Reversed</p>
                            {row.reversed_by && <p>By: {row.reversed_by}</p>}
                            {row.reversed_at && <p>On: {new Date(row.reversed_at).toLocaleString()}</p>}
                            {row.reversal_reason && <p>Reason: {row.reversal_reason}</p>}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">{row.amount ?? "-"}</td>
                      <td className="py-2 px-3 text-right">
                        <Link
                          href={`${base}/${row.module === "transactions" ? "transactions" : row.module}`}
                          className="text-[var(--color-primary)] hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
