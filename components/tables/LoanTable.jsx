"use client";

import { formatDateTime } from '@/utils/dateHelpers';
import { formatCurrency } from '@/utils/currency';
import { useBank } from '@/hooks/useBank';
import { Button } from '@/components/ui/Button';
import { LOAN_STATUSES } from '@/utils/constants';
import { RotateCcw } from 'lucide-react';

const STATUS_COLORS = {
  active: 'bg-red-100 text-red-700',
  partially_returned: 'bg-yellow-100 text-yellow-700',
  returned: 'bg-green-100 text-green-700',
};

const SOURCE_LABELS = {
  hand_cash: 'Hand Cash',
  mother_account: 'Mother Account',
  profit_account: 'Profit Account',
};

export function LoanTable({ loans = [], onReturn }) {
  const { currencySymbol } = useBank();

  if (loans.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-[var(--color-text-muted)]">
        No loans found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Borrower</th>
            <th className="text-right py-3 px-4 font-medium text-[var(--color-text-muted)]">Amount</th>
            <th className="text-right py-3 px-4 font-medium text-[var(--color-text-muted)]">Returned</th>
            <th className="text-right py-3 px-4 font-medium text-[var(--color-text-muted)]">Remaining</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Source</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Status</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Due Date</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Issued</th>
            <th className="text-right py-3 px-4 font-medium text-[var(--color-text-muted)]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => {
            const remaining = parseFloat(loan.amount) - parseFloat(loan.returned_amount || 0);
            return (
              <tr key={loan.id} className="border-b border-border hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4">
                  <p className="font-medium">{loan.borrower?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{loan.borrower?.email}</p>
                </td>
                <td className="py-3 px-4 text-right font-medium">
                  {formatCurrency(loan.amount, currencySymbol)}
                </td>
                <td className="py-3 px-4 text-right text-green-600 font-medium">
                  {formatCurrency(loan.returned_amount || 0, currencySymbol)}
                </td>
                <td className="py-3 px-4 text-right text-red-600 font-medium">
                  {formatCurrency(remaining, currencySymbol)}
                </td>
                <td className="py-3 px-4 text-xs">
                  {SOURCE_LABELS[loan.source_type] || loan.source_type}
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[loan.status] || ''}`}>
                    {LOAN_STATUSES[loan.status] || loan.status}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap text-xs">
                  {loan.due_date ? new Date(loan.due_date).toLocaleDateString() : '—'}
                </td>
                <td className="py-3 px-4 whitespace-nowrap text-xs">
                  {formatDateTime(loan.created_at)}
                </td>
                <td className="py-3 px-4 text-right">
                  {loan.status !== 'returned' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onReturn?.(loan)}
                      title="Return loan"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Return
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
