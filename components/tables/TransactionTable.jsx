"use client";

import { formatDateTime } from '@/utils/dateHelpers';
import { formatCurrency } from '@/utils/currency';
import { useBank } from '@/hooks/useBank';
import { ArrowDownToLine, ArrowUpFromLine, Wallet, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const TYPE_CONFIG = {
  deposit: { label: 'Deposit', icon: ArrowDownToLine, color: 'bg-success/10 text-success', amountColor: 'text-success', prefix: '+' },
  withdrawal: { label: 'Withdrawal', icon: ArrowUpFromLine, color: 'bg-warning/10 text-warning', amountColor: 'text-warning', prefix: '-' },
  cash_in: { label: 'Cash In', icon: Wallet, color: 'bg-primary/10 text-primary', amountColor: 'text-primary', prefix: '+' },
  fund_transfer: { label: 'Fund Transfer', icon: ArrowRightLeft, color: 'bg-slate-100 text-slate-700', amountColor: 'text-slate-700', prefix: '-' },
};

function getFundInto(txn) {
  if (txn.type !== 'cash_in') return null;
  if (txn.mother_account_id) return txn.mother_accounts?.name || 'Mother Account';
  if (txn.profit_account_id) return txn.profit_accounts?.name || 'Profit Account';
  return 'Hand Cash';
}

export function TransactionTable({ transactions = [], onEdit, onReverse }) {
  const { currencySymbol } = useBank();

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-[var(--color-text-muted)]">
        No transactions found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Date</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">TRN ID</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Type</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Customer</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Account</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Fund Into</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Source</th>
            <th className="text-right py-3 px-4 font-medium text-[var(--color-text-muted)]">Amount</th>
            {onReverse && (
              <th className="text-right py-3 px-4 font-medium text-[var(--color-text-muted)]">Action</th>
            )}
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => {
            const cfg = TYPE_CONFIG[txn.type] || TYPE_CONFIG.deposit;
            const Icon = cfg.icon;
            const isCashIn = txn.type === 'cash_in';
            const fundInto = getFundInto(txn);
            return (
              <tr
                key={txn.id}
                className="border-b border-border hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onEdit?.(txn)}
              >
                <td className="py-3 px-4 whitespace-nowrap">{formatDateTime(txn.created_at)}</td>
                <td className="py-3 px-4 whitespace-nowrap text-xs">{txn.trn_id || '—'}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${cfg.color}`}>
                    <Icon className="h-3 w-3" />
                    {cfg.label}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <p className="font-medium">{txn.customer_name || txn.source || '—'}</p>
                  {txn.customer_account && (
                    <p className="text-xs text-[var(--color-text-muted)]">{txn.customer_account}</p>
                  )}
                  {txn.is_reversed && (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-[11px] text-danger font-medium">Reversed</p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        By: {txn.reversed_by_profile?.full_name || txn.reversed_by_profile?.email || 'Unknown'}
                      </p>
                      {txn.reversed_at && (
                        <p className="text-[11px] text-[var(--color-text-muted)]">On: {formatDateTime(txn.reversed_at)}</p>
                      )}
                      {txn.reversal_reason && (
                        <p className="text-[11px] text-[var(--color-text-muted)]">Reason: {txn.reversal_reason}</p>
                      )}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-xs">
                  {txn.mother_accounts?.name || '—'}
                </td>
                <td className="py-3 px-4 text-xs">
                  {isCashIn ? <span className="text-[var(--color-primary)] font-medium">{fundInto}</span> : '—'}
                </td>
                <td className="py-3 px-4 text-xs">
                  {isCashIn && txn.source ? txn.source : '—'}
                </td>
                <td className={`py-3 px-4 text-right font-medium ${cfg.amountColor}`}>
                  {cfg.prefix}{formatCurrency(txn.amount, currencySymbol)}
                </td>
                {onReverse && (
                  <td className="py-3 px-4 text-right">
                    {txn.is_reversed ? (
                      <span className="text-xs text-danger font-medium">Reversed</span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReverse(txn);
                        }}
                      >
                        Reverse
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
