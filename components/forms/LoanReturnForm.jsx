"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loanReturnSchema } from '@/utils/validators';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { useBank } from '@/hooks/useBank';
import { numberToWords } from '@/utils/numberToWords';
import { LOAN_STATUSES } from '@/utils/constants';

export function LoanReturnForm({ loan, onSubmit, loading = false }) {
  const { currencySymbol } = useBank();
  const remaining = parseFloat(loan.amount) - parseFloat(loan.returned_amount || 0);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loanReturnSchema),
    defaultValues: {
      amount: '',
      notes: '',
    },
  });

  const amountValue = watch('amount');
  const amountWords = numberToWords(amountValue);

  const handleFormSubmit = async (data) => {
    if (parseFloat(data.amount) > remaining) {
      return;
    }
    await onSubmit({ ...data, loan_id: loan.id });
    reset();
  };

  return (
    <div className="space-y-4">
      {/* Loan Details */}
      <div className="rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--color-text-muted)]">Borrower</span>
          <span className="font-medium">{loan.borrower?.full_name || 'Unknown'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-text-muted)]">Total Amount</span>
          <span className="font-medium">{formatCurrency(loan.amount, currencySymbol)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-text-muted)]">Already Returned</span>
          <span className="font-medium text-green-600">{formatCurrency(loan.returned_amount || 0, currencySymbol)}</span>
        </div>
        <div className="flex justify-between border-t pt-2">
          <span className="text-[var(--color-text-muted)]">Remaining</span>
          <span className="font-bold text-red-600">{formatCurrency(remaining, currencySymbol)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-text-muted)]">Status</span>
          <span className="font-medium">{LOAN_STATUSES[loan.status]}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label>Return Amount * (max: {formatCurrency(remaining, currencySymbol)})</Label>
          <Input
            type="number"
            step="0.01"
            max={remaining}
            {...register('amount', { valueAsNumber: true })}
            placeholder="0.00"
          />
          {amountWords && (
            <p className="text-xs text-[var(--color-primary)] italic">{amountWords}</p>
          )}
          {errors.amount && <p className="text-xs text-danger">{errors.amount.message}</p>}
          {amountValue > remaining && (
            <p className="text-xs text-danger">Amount exceeds remaining balance</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Input {...register('notes')} placeholder="Return details" />
        </div>

        <Button type="submit" disabled={loading || amountValue > remaining} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Process Return
        </Button>
      </form>
    </div>
  );
}
