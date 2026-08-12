"use client";

import { useState, useCallback } from "react";
import { useBank } from "@/hooks/useBank";
import { useAuth } from "@/hooks/useAuth";
import { useReports } from "@/hooks/useReports";
import { useTransactionStore } from "@/stores/transactionStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import {
  Select as RadixSelect,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/Select";
import { formatCurrency } from "@/utils/currency";
import { formatDate } from "@/utils/dateHelpers";
import { REPORT_PERIODS } from "@/utils/constants";
import { generateReportPdf } from "@/utils/generateReportPdf";
import {
  FileText,
  Calendar,
  Printer,
  CheckCircle,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const REPORT_TYPES = {
  full: "Full Report (Everything)",
  with_expenses: "Include Expenses Report",
  no_expenses: "Without Expenses Report",
  expenses_only: "Only Expenses Report",
};

export default function ReportsPage() {
  const { bank, currencySymbol } = useBank();
  const { profile } = useAuth();
  const { generateReport, loading } = useReports();
  const triggerRefresh = useTransactionStore((s) => s.triggerRefresh);
  const [period, setPeriod] = useState("today");
  const [reportType, setReportType] = useState("full");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [reportData, setReportData] = useState(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [actualHandCash, setActualHandCash] = useState("");

  const erpHandCash = reportData?.handCashBalance || 0;
  const handCashMatch =
    actualHandCash !== "" &&
    Math.floor(parseFloat(actualHandCash) || 0) === Math.floor(erpHandCash);

  const handleGenerate = async () => {
    try {
      let dateFrom, dateTo;
      const today = new Date();

      switch (period) {
        case "today":
          dateFrom = dateTo = today.toISOString().split("T")[0];
          break;
        case "week": {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          dateFrom = weekAgo.toISOString().split("T")[0];
          dateTo = today.toISOString().split("T")[0];
          break;
        }
        case "month": {
          dateFrom = new Date(today.getFullYear(), today.getMonth(), 1)
            .toISOString()
            .split("T")[0];
          dateTo = today.toISOString().split("T")[0];
          break;
        }
        case "quarter": {
          const qtr = new Date(today);
          qtr.setMonth(qtr.getMonth() - 3);
          dateFrom = qtr.toISOString().split("T")[0];
          dateTo = today.toISOString().split("T")[0];
          break;
        }
        case "custom":
          if (!customFrom || !customTo) {
            toast.error("Please select date range");
            return;
          }
          dateFrom = customFrom;
          dateTo = customTo;
          break;
        default:
          dateFrom = dateTo = today.toISOString().split("T")[0];
      }

      const data = await generateReport(dateFrom, dateTo, reportType);
      setReportData({ ...data, dateFrom, dateTo });
    } catch (error) {
      toast.error("Failed to generate report");
    }
  };

  const showTransactions = reportType !== "expenses_only";
  const showExpenses = reportType !== "no_expenses";

  const openPrintModal = () => {
    setActualHandCash("");
    setPrintModalOpen(true);
  };

  const handlePrintReport = useCallback(() => {
    if (!reportData || !handCashMatch) return;
    try {
      generateReportPdf({
        reportData,
        bank,
        currencySymbol,
        reportTypeLabel: REPORT_TYPES[reportType],
        showTransactions,
        showExpenses,
        actualHandCash: parseFloat(actualHandCash),
        generatedBy: profile?.full_name || "Unknown User",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    }
    setPrintModalOpen(false);
    triggerRefresh();
  }, [
    reportData,
    bank,
    currencySymbol,
    reportType,
    showTransactions,
    showExpenses,
    actualHandCash,
    handCashMatch,
    profile,
    triggerRefresh,
  ]);

  return (
    <div className="space-y-6 overflow-x-hidden max-w-full">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Generate and download business reports
        </p>
      </div>

      {/* Report Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Report Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label>Period</Label>
              <RadixSelect value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REPORT_PERIODS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </RadixSelect>
            </div>
            <div>
              <Label>Report Type</Label>
              <RadixSelect value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REPORT_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </RadixSelect>
            </div>
            {period === "custom" && (
              <>
                <div>
                  <Label>From</Label>
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label>To</Label>
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating..." : "Generate Report"}
            </Button>
            {reportData && (
              <Button variant="outline" onClick={openPrintModal}>
                <Printer className="h-4 w-4 mr-2" /> Print Report
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Print Verification Modal */}
      <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Hand Cash Before Printing</DialogTitle>
            <DialogDescription>
              Enter the actual counted hand cash amount to verify against the
              system balance before printing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
              <span className="text-sm text-[var(--color-text-muted)]">
                System Hand Cash
              </span>
              <span className="text-lg font-bold text-[var(--color-primary)]">
                {formatCurrency(erpHandCash, currencySymbol)}
              </span>
            </div>
            <div>
              <Label>Actual Hand Cash (Counted)</Label>
              <Input
                type="number"
                step="any"
                placeholder="Enter counted hand cash amount"
                value={actualHandCash}
                onChange={(e) => setActualHandCash(e.target.value)}
                autoFocus
              />
            </div>
            {actualHandCash !== "" && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${
                  handCashMatch
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {handCashMatch ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Hand cash matches! You can print the report.
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Hand cash does not match. System:{" "}
                    {Math.floor(erpHandCash)}, Entered:{" "}
                    {Math.floor(parseFloat(actualHandCash) || 0)}
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPrintModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handlePrintReport} disabled={!handCashMatch}>
              <Printer className="h-4 w-4 mr-2" /> Print as PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Results */}
      {reportData && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Report Summary
                </span>
                <span className="text-sm font-normal text-[var(--color-text-muted)]">
                  {formatDate(reportData.dateFrom)} –{" "}
                  {formatDate(reportData.dateTo)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="max-w-full overflow-x-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-full">
                {showTransactions && (
                  <>
                    <div className="p-3 bg-[var(--color-surface)] rounded-lg min-w-0">
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Total Deposits
                      </p>
                      <p className="text-lg font-bold text-success break-words">
                        {formatCurrency(
                          reportData.totalDeposits || 0,
                          currencySymbol
                        )}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {reportData.depositCount || 0} txns
                      </p>
                    </div>
                    <div className="p-3 bg-[var(--color-surface)] rounded-lg min-w-0">
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Total Withdrawals
                      </p>
                      <p className="text-lg font-bold text-danger break-words">
                        {formatCurrency(
                          reportData.totalWithdrawals || 0,
                          currencySymbol
                        )}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {reportData.withdrawalCount || 0} txns
                      </p>
                    </div>
                    <div className="p-3 bg-[var(--color-surface)] rounded-lg min-w-0">
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Total Cash In
                      </p>
                      <p className="text-lg font-bold text-blue-500 break-words">
                        {formatCurrency(
                          reportData.totalCashIn || 0,
                          currencySymbol
                        )}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {reportData.cashInCount || 0} txns
                      </p>
                    </div>
                  </>
                )}
                {showExpenses && (
                  <div className="p-3 bg-[var(--color-surface)] rounded-lg min-w-0">
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Total Expenses
                    </p>
                    <p className="text-lg font-bold text-warning break-words">
                      {formatCurrency(
                        reportData.totalExpenses || 0,
                        currencySymbol
                      )}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {reportData.expenseCount || 0} items
                    </p>
                  </div>
                )}
                <div className="p-3 bg-[var(--color-surface)] rounded-lg border-2 border-[var(--color-primary)] min-w-0">
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Hand Cash Balance
                  </p>
                  <p className="text-lg font-bold text-[var(--color-primary)] break-words">
                    {formatCurrency(
                      reportData.handCashBalance || 0,
                      currencySymbol
                    )}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Current
                  </p>
                </div>
              </div>

              {/* Mother Account Balances */}
              {reportData.motherAccountBalances &&
                reportData.motherAccountBalances.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold mb-2">
                      Mother Account Balances
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-w-full">
                      {reportData.motherAccountBalances.map((ma) => (
                        <div
                          key={ma.id}
                          className={`p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] min-w-0 ${
                            !ma.isActive ? "opacity-50" : ""
                          }`}
                        >
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {ma.name}
                          </p>
                          <p className="text-sm font-bold break-words">
                            {formatCurrency(ma.balance, currencySymbol)}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-muted)] break-all overflow-hidden">
                            {ma.accountNumber || ""}
                          </p>
                        </div>
                      ))}
                      <div className="p-3 bg-[var(--color-surface)] rounded-lg border-2 border-[var(--color-accent)] min-w-0">
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Total Mother Balance
                        </p>
                        <p className="text-sm font-bold break-words">
                          {formatCurrency(
                            reportData.totalMotherBalance || 0,
                            currencySymbol
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* Total Balance = Total Mother Balance + Hand Cash */}
              <div className="mt-4 p-4 border-2 border-[var(--color-primary)] rounded-lg bg-[var(--color-primary)]/5 max-w-full overflow-x-hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="text-center">
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Total Mother Balance
                    </p>
                    <p className="text-lg font-bold break-words">
                      {formatCurrency(
                        reportData.totalMotherBalance || 0,
                        currencySymbol
                      )}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Hand Cash Balance
                    </p>
                    <p className="text-lg font-bold break-words">
                      {formatCurrency(
                        reportData.handCashBalance || 0,
                        currencySymbol
                      )}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-[var(--color-primary)]/10 rounded-lg">
                    <p className="text-xs text-[var(--color-text-muted)] font-semibold">
                      Total Balance
                    </p>
                    <p className="text-2xl font-bold text-[var(--color-primary)] break-words">
                      {formatCurrency(
                        (reportData.totalMotherBalance || 0) +
                          (reportData.handCashBalance || 0),
                        currencySymbol
                      )}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      Mother Balance + Hand Cash
                    </p>
                  </div>
                </div>
              </div>

              {/* Net Flow */}
              <div className="mt-4 p-4 border border-[var(--color-border)] rounded-lg text-center">
                <p className="text-sm text-[var(--color-text-muted)]">
                  Net Flow
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(reportData.netFlow || 0, currencySymbol)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Details */}
          {showTransactions &&
            reportData.transactions &&
            reportData.transactions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Transaction Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border)]">
                          <th className="text-left py-2 px-3">Date</th>
                          <th className="text-left py-2 px-3">TRN ID</th>
                          <th className="text-left py-2 px-3">Type</th>
                          <th className="text-left py-2 px-3">Customer</th>
                          <th className="text-left py-2 px-3">Account No.</th>
                          <th className="text-left py-2 px-3">Mother A/C</th>
                          <th className="text-left py-2 px-3">Fund Into</th>
                          <th className="text-left py-2 px-3">Source</th>
                          <th className="text-right py-2 px-3">Credit</th>
                          <th className="text-right py-2 px-3">Debit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.transactions.map((txn, i) => {
                          const isCredit =
                            txn.type === "deposit" || txn.type === "cash_in";
                          const isCashIn = txn.type === "cash_in";
                          const fundInto = isCashIn
                            ? txn.mother_account_id
                              ? txn.mother_accounts?.name || "Mother Account"
                              : txn.profit_account_id
                                ? txn.profit_accounts?.name || "Profit Account"
                                : "Hand Cash"
                            : "-";
                          return (
                            <tr
                              key={i}
                              className="border-b border-[var(--color-border)]"
                            >
                              <td className="py-2 px-3 whitespace-nowrap">
                                {formatDate(txn.created_at)}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                {txn.trn_id || "-"}
                              </td>
                              <td className="py-2 px-3 capitalize">
                                {txn.type?.replace("_", " ")}
                              </td>
                              <td className="py-2 px-3">
                                {txn.customer_name || "-"}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                {txn.customer_account || "-"}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                {txn.mother_accounts?.name ||
                                  txn.motherAccount?.accountNumber ||
                                  "-"}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                {fundInto}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                {isCashIn && txn.source ? txn.source : "-"}
                              </td>
                              <td className="py-2 px-3 text-right text-success">
                                {isCredit
                                  ? formatCurrency(txn.amount, currencySymbol)
                                  : "-"}
                              </td>
                              <td className="py-2 px-3 text-right text-danger">
                                {!isCredit
                                  ? formatCurrency(txn.amount, currencySymbol)
                                  : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        {(() => {
                          const totalCredit = reportData.transactions.reduce(
                            (sum, txn) => {
                              return txn.type === "deposit" ||
                                txn.type === "cash_in"
                                ? sum + Number(txn.amount || 0)
                                : sum;
                            },
                            0
                          );
                          const totalDebit = reportData.transactions.reduce(
                            (sum, txn) => {
                              return txn.type !== "deposit" &&
                                txn.type !== "cash_in"
                                ? sum + Number(txn.amount || 0)
                                : sum;
                            },
                            0
                          );
                          return (
                            <tr className="border-t-2 border-[var(--color-border)] font-bold bg-[var(--color-surface)]">
                              <td colSpan={8} className="py-2 px-3 text-right">
                                Total
                              </td>
                              <td className="py-2 px-3 text-right text-success">
                                {formatCurrency(totalCredit, currencySymbol)}
                              </td>
                              <td className="py-2 px-3 text-right text-danger">
                                {formatCurrency(totalDebit, currencySymbol)}
                              </td>
                            </tr>
                          );
                        })()}
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Expense Details */}
          {showExpenses &&
            reportData.expenses &&
            reportData.expenses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Expense Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border)]">
                          <th className="text-left py-2 px-3">Date</th>
                          <th className="text-left py-2 px-3">TRN ID</th>
                          <th className="text-left py-2 px-3">Category</th>
                          <th className="text-left py-2 px-3">Description</th>
                          <th className="text-left py-2 px-3">
                            Deducted From
                          </th>
                          <th className="text-left py-2 px-3">Account</th>
                          <th className="text-right py-2 px-3">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.expenses.map((exp, i) => (
                          <tr
                            key={i}
                            className="border-b border-[var(--color-border)]"
                          >
                            <td className="py-2 px-3 whitespace-nowrap">
                              {formatDate(exp.created_at)}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              {exp.trn_id || "-"}
                            </td>
                            <td className="py-2 px-3">
                              {exp.expense_categories?.name || "-"}
                            </td>
                            <td className="py-2 px-3">
                              {exp.description || "-"}
                            </td>
                            <td className="py-2 px-3 capitalize">
                              {exp.deduct_from?.replace("_", " ") || "-"}
                            </td>
                            <td className="py-2 px-3">
                              {exp.mother_accounts?.name ||
                                exp.motherAccount?.accountNumber ||
                                exp.profit_accounts?.name ||
                                "-"}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {formatCurrency(exp.amount, currencySymbol)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[var(--color-border)] font-bold bg-[var(--color-surface)]">
                          <td colSpan={6} className="py-2 px-3 text-right">
                            Total Expense
                          </td>
                          <td className="py-2 px-3 text-right text-danger">
                            {formatCurrency(
                              reportData.totalExpenses || 0,
                              currencySymbol
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Loan Return Details */}
          {showTransactions &&
            reportData.loanReturns &&
            reportData.loanReturns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Loan Return Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border)]">
                          <th className="text-left py-2 px-3">Date</th>
                          <th className="text-left py-2 px-3">TRN ID</th>
                          <th className="text-left py-2 px-3">Destination</th>
                          <th className="text-left py-2 px-3">Notes</th>
                          <th className="text-right py-2 px-3">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.loanReturns.map((ret, i) => (
                          <tr key={ret.id || i} className="border-b border-[var(--color-border)]">
                            <td className="py-2 px-3 whitespace-nowrap">{formatDate(ret.created_at)}</td>
                            <td className="py-2 px-3 whitespace-nowrap">{ret.trn_id || "-"}</td>
                            <td className="py-2 px-3">{ret.destination_label || ret.destination_type || "-"}</td>
                            <td className="py-2 px-3">{ret.notes || "-"}</td>
                            <td className="py-2 px-3 text-right text-emerald-600">
                              {formatCurrency(ret.amount, currencySymbol)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[var(--color-border)] font-bold bg-[var(--color-surface)]">
                          <td colSpan={4} className="py-2 px-3 text-right">Total Loan Returns</td>
                          <td className="py-2 px-3 text-right text-emerald-600">
                            {formatCurrency(reportData.totalLoanReturns || 0, currencySymbol)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Software Credit Footer */}
          <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
            Software by: @rhmunna143
          </p>
        </div>
      )}
    </div>
  );
}
