"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBank } from "@/hooks/useBank";
import { useMotherAccounts } from "@/hooks/useMotherAccounts";
import { useHandCash } from "@/hooks/useHandCash";
import { useProfitAccounts } from "@/hooks/useProfitAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useAlerts } from "@/hooks/useAlerts";
import { useTransactionStore } from "@/stores/transactionStore";
import { SummaryCards } from "@/components/charts/SummaryCards";
import { BalanceTrendChart } from "@/components/charts/BalanceTrendChart";
import { ExpenseBreakdownChart } from "@/components/charts/ExpenseBreakdownChart";
import { TransactionTable } from "@/components/tables/TransactionTable";
import { BalanceAlert } from "@/components/alerts/BalanceAlert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { dailyLogService } from "@/services/dailyLogService";
import {
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
} from "lucide-react";
import { formatCurrency } from "@/utils/currency";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const { user } = useAuth();
  const { bank, bankId, currencySymbol } = useBank();
  const { accounts: motherAccounts } = useMotherAccounts();
  const { handCash, balance: handCashBalance } = useHandCash();
  const { accounts: profitAccounts } = useProfitAccounts();
  const { getTodaySummary, getTransactions, getExpenses } = useTransactions();
  const { alerts } = useAlerts();
  const { refreshKey } = useTransactionStore();

  const [todaySummary, setTodaySummary] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalCashIn: 0,
    totalExpenses: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState([]);
  const [balanceTrend, setBalanceTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingLog, setGeneratingLog] = useState(false);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [logsExpanded, setLogsExpanded] = useState(false);

  const totalMotherBalance = motherAccounts.reduce(
    (sum, acc) => sum + parseFloat(acc.balance || 0),
    0
  );
  const totalProfitBalance = profitAccounts.reduce(
    (sum, acc) => sum + parseFloat(acc.balance || 0),
    0
  );

  useEffect(() => {
    async function loadData() {
      if (!bankId) return;
      setLoading(true);
      try {
        const [summary, txns, expenses, logs] = await Promise.all([
          getTodaySummary(),
          getTransactions({ limit: 10 }),
          getExpenses({ limit: 100 }),
          dailyLogService.getLatest(bankId, 14),
        ]);

        if (summary) setTodaySummary(summary);
        if (txns?.data) setRecentTransactions(txns.data);

        // Build balance trend from daily logs
        if (logs && logs.length > 0) {
          setDailyLogs(
            logs.sort((a, b) => b.log_date.localeCompare(a.log_date))
          );
          const trendData = logs
            .sort((a, b) => a.log_date.localeCompare(b.log_date))
            .map((log) => ({
              date: new Date(log.log_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              handCash: parseFloat(log.closing_hand_cash || 0),
              motherBalance:
                parseFloat(log.total_deposits || 0) -
                parseFloat(log.total_withdrawals || 0),
              profitBalance: parseFloat(log.total_commissions || 0),
            }));
          setBalanceTrend(trendData);
        }

        // Build expense breakdown
        if (expenses) {
          const breakdown = {};
          expenses.forEach((exp) => {
            const cat = exp.expense_categories?.name || "Other";
            breakdown[cat] = (breakdown[cat] || 0) + parseFloat(exp.amount);
          });
          setExpenseBreakdown(
            Object.entries(breakdown).map(([name, value]) => ({ name, value }))
          );
        }
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [bankId, refreshKey]);

  const handleGenerateDailyLog = async () => {
    setGeneratingLog(true);
    try {
      const newLog = await dailyLogService.generate(bankId, user.id);
      toast.success("Daily log generated!");
      // Refresh logs list
      const logs = await dailyLogService.getLatest(bankId, 14);
      if (logs)
        setDailyLogs(
          logs.sort((a, b) => b.log_date.localeCompare(a.log_date))
        );
      setLogsExpanded(true);
    } catch (error) {
      toast.error(error.message || "Failed to generate daily log");
    } finally {
      setGeneratingLog(false);
    }
  };

  if (loading && !bank) {
    return <LoadingSpinner className="h-64" />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            Dashboard
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Overview of your banking operations
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateDailyLog}
          disabled={generatingLog}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${generatingLog ? "animate-spin" : ""}`}
          />
          Generate Daily Log
        </Button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceAlert alerts={alerts} />
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <SummaryCards
        totalMotherBalance={totalMotherBalance}
        handCashBalance={handCashBalance}
        totalProfitBalance={totalProfitBalance}
        todayDeposits={todaySummary.totalDeposits}
        todayWithdrawals={todaySummary.totalWithdrawals}
        todayExpenses={todaySummary.totalExpenses}
      />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Balance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceTrendChart data={balanceTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseBreakdownChart data={expenseBreakdown} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionTable transactions={recentTransactions} />
        </CardContent>
      </Card>

      {/* Daily Logs */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setLogsExpanded((v) => !v)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" /> Daily Logs
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">
                {dailyLogs.length} log{dailyLogs.length !== 1 ? "s" : ""}
              </span>
              {logsExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </div>
        </CardHeader>
        {logsExpanded && (
          <CardContent>
            {dailyLogs.length === 0 ? (
              <p className="text-sm text-center py-6 text-[var(--color-text-muted)]">
                No daily logs yet. Click &quot;Generate Daily Log&quot; to
                create one.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-[var(--color-text-muted)]">
                        Date
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-[var(--color-text-muted)]">
                        Deposits
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-[var(--color-text-muted)]">
                        Withdrawals
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-[var(--color-text-muted)]">
                        Cash In
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-[var(--color-text-muted)]">
                        Expenses
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-[var(--color-text-muted)]">
                        Hand Cash
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-border hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-2 px-3 flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                          {new Date(
                            log.log_date + "T00:00:00"
                          ).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-2 px-3 text-right text-success font-medium">
                          {formatCurrency(
                            log.total_deposits || 0,
                            currencySymbol
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-warning font-medium">
                          {formatCurrency(
                            log.total_withdrawals || 0,
                            currencySymbol
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-primary font-medium">
                          {formatCurrency(
                            log.total_cash_in || 0,
                            currencySymbol
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-danger font-medium">
                          {formatCurrency(
                            log.total_expenses || 0,
                            currencySymbol
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-bold">
                          {formatCurrency(
                            log.closing_hand_cash || 0,
                            currencySymbol
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
