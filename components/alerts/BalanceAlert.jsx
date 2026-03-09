"use client";

import { AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useBank } from '@/hooks/useBank';
import { formatCurrency } from '@/utils/currency';

export function BalanceAlert({ alerts }) {
  const router = useRouter();
  const { currencySymbol } = useBank();

  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4 cursor-pointer hover:bg-warning/10 transition-colors"
          onClick={() => {
            if (alert.type === 'hand_cash') router.push('/hand-cash');
            else if (alert.type === 'mother_account') router.push('/mother-accounts');
            else router.push('/profit-accounts');
          }}
        >
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--color-text)]">
              Low Balance: {alert.accountName}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Current: {formatCurrency(alert.balance, currencySymbol)} | Threshold: {formatCurrency(alert.threshold, currencySymbol)}
            </p>
          </div>
          <span className="text-xs text-primary font-medium">Fund →</span>
        </div>
      ))}
    </div>
  );
}
