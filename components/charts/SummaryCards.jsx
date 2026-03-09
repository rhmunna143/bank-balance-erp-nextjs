"use client";

import { useBank } from '@/hooks/useBank';
import { formatCurrency } from '@/utils/currency';
import {
  Building2,
  HandCoins,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  Receipt,
} from 'lucide-react';

function SummaryCard({ title, value, icon: Icon, color = 'primary', trend }) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    accent: 'bg-accent/10 text-accent',
    secondary: 'bg-gray-100 text-[var(--color-secondary)]',
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-3 md:p-4 overflow-hidden">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs md:text-sm text-[var(--color-text-muted)] truncate">{title}</p>
          <p className="text-sm md:text-lg lg:text-xl font-bold text-[var(--color-text)] mt-1 truncate" title={value}>{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
              {trend >= 0 ? '+' : ''}{trend}% from yesterday
            </p>
          )}
        </div>
        <div className={`rounded-full p-2 md:p-3 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5 md:h-6 md:w-6" />
        </div>
      </div>
    </div>
  );
}

export function SummaryCards({
  totalMotherBalance = 0,
  handCashBalance = 0,
  totalProfitBalance = 0,
  todayDeposits = 0,
  todayWithdrawals = 0,
  todayExpenses = 0,
}) {
  const { currencySymbol } = useBank();

  const cards = [
    {
      title: 'Total Mother Accounts',
      value: formatCurrency(totalMotherBalance, currencySymbol),
      icon: Building2,
      color: 'primary',
    },
    {
      title: 'Hand Cash',
      value: formatCurrency(handCashBalance, currencySymbol),
      icon: HandCoins,
      color: 'success',
    },
    {
      title: 'Total Profit',
      value: formatCurrency(totalProfitBalance, currencySymbol),
      icon: TrendingUp,
      color: 'accent',
    },
    {
      title: "Today's Deposits",
      value: formatCurrency(todayDeposits, currencySymbol),
      icon: ArrowDownToLine,
      color: 'primary',
    },
    {
      title: "Today's Withdrawals",
      value: formatCurrency(todayWithdrawals, currencySymbol),
      icon: ArrowUpFromLine,
      color: 'warning',
    },
    {
      title: "Today's Expenses",
      value: formatCurrency(todayExpenses, currencySymbol),
      icon: Receipt,
      color: 'danger',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
      {cards.map((card) => (
        <SummaryCard key={card.title} {...card} />
      ))}
    </div>
  );
}
