"use client";

import { formatDateTime } from '@/utils/dateHelpers';
import { formatCurrency } from '@/utils/currency';
import { useBank } from '@/hooks/useBank';
import { Button } from '@/components/ui/Button';
import { Pencil, RotateCcw } from 'lucide-react';

export function ExpenseTable({ expenses = [], onEdit, onReverse }) {
  const { currencySymbol } = useBank();

  if (expenses.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-[var(--color-text-muted)]">
        No expenses found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Date</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Category</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Particulars</th>
            <th className="text-right py-3 px-4 font-medium text-[var(--color-text-muted)]">Amount</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Deducted From</th>
            <th className="text-right py-3 px-4 font-medium text-[var(--color-text-muted)]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id} className="border-b border-border hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4 whitespace-nowrap">{formatDateTime(expense.created_at)}</td>
              <td className="py-3 px-4">
                <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium">
                  {expense.expense_categories?.name || 'Unknown'}
                </span>
              </td>
              <td className="py-3 px-4 text-[var(--color-text-muted)]">
                {expense.description || '-'}
                {expense.is_reversed && (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[11px] text-danger font-medium">Reversed</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      By: {expense.reversed_by_profile?.full_name || expense.reversed_by_profile?.email || 'Unknown'}
                    </p>
                    {expense.reversed_at && (
                      <p className="text-[11px] text-[var(--color-text-muted)]">On: {formatDateTime(expense.reversed_at)}</p>
                    )}
                    {expense.reversal_reason && (
                      <p className="text-[11px] text-[var(--color-text-muted)]">Reason: {expense.reversal_reason}</p>
                    )}
                  </div>
                )}
              </td>
              <td className="py-3 px-4 text-right font-medium text-danger">
                -{formatCurrency(expense.amount, currencySymbol)}
              </td>
              <td className="py-3 px-4 text-xs">
                {expense.deduct_from?.replace('_', ' ') || '-'}
              </td>
              <td className="py-3 px-4 text-right">
                <div className="inline-flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit?.(expense)}
                    title="Edit expense"
                    disabled={!!expense.is_reversed}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {onReverse && (
                    expense.is_reversed ? (
                      <span className="text-xs text-danger font-medium px-2">Reversed</span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReverse(expense)}
                        title="Reverse expense"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reverse
                      </Button>
                    )
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
