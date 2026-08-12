"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loanReturnSchema } from '@/utils/validators';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { useBank } from '@/hooks/useBank';
import { numberToWords } from '@/utils/numberToWords';
import { LOAN_STATUSES } from '@/utils/constants';
import { useEffect } from 'react';

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function LoanReturnForm({
  loan,
  onSubmit,
  loading = false,
  motherAccounts = [],
  profitAccounts = [],
}) {
  const { currencySymbol } = useBank();
  const remaining = parseFloat(loan.amount) - parseFloat(loan.returnedAmount || 0);
  const defaultDestinationType = loan.sourceType || 'hand_cash';
  const defaultDestinationAccountId =
    loan.sourceType === 'mother_account' || loan.sourceType === 'profit_account'
      ? loan.sourceAccountId || ''
      : '';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loanReturnSchema),
    defaultValues: {
      trn_id: '',
      amount: '',
      destination_type: defaultDestinationType,
      destination_account_id: defaultDestinationAccountId,
      notes: '',
      created_at: getToday(),
    },
  });

  useEffect(() => {
    reset({
      trn_id: '',
      amount: '',
      destination_type: defaultDestinationType,
      destination_account_id: defaultDestinationAccountId,
      notes: '',
      created_at: getToday(),
    });
  }, [loan.id, defaultDestinationType, defaultDestinationAccountId, reset]);

  const amountValue = watch('amount');
  const destinationType = watch('destination_type');
  const amountWords = numberToWords(amountValue);

  const destinationOptions =
    destinationType === 'mother_account'
      ? motherAccounts.map((a) => ({ id: a.id, label: `${a.name} (${a.accountNumber})` }))
      : destinationType === 'profit_account'
        ? profitAccounts.map((a) => ({ id: a.id, label: a.name }))
        : [];

  const handleFormSubmit = async (data) => {
    if (parseFloat(data.amount) > remaining) {
      return;
    }

    if (data.destination_type !== 'hand_cash' && !data.destination_account_id) {
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
          <span className="font-medium">{loan.borrower?.fullName || 'Unknown'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-text-muted)]">Total Amount</span>
          <span className="font-medium">{formatCurrency(loan.amount, currencySymbol)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-text-muted)]">Already Returned</span>
          <span className="font-medium text-green-600">{formatCurrency(loan.returnedAmount || 0, currencySymbol)}</span>
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

        <div className="space-y-2">
          <Label>TRN ID</Label>
          <Input {...register('trn_id')} placeholder="Optional transaction id" />
        </div>

        <div className="space-y-2">
          <Label>Return Destination *</Label>
          <Select
            value={watch('destination_type') || ""}
            onValueChange={(val) => {
              setValue('destination_type', val, { shouldValidate: true });
              setValue('destination_account_id', '', { shouldValidate: true });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select destination" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hand_cash">Hand Cash</SelectItem>
              <SelectItem value="mother_account">Mother Account</SelectItem>
              <SelectItem value="profit_account">Profit Account</SelectItem>
            </SelectContent>
          </Select>
          {errors.destination_type && <p className="text-xs text-danger">{errors.destination_type.message}</p>}
        </div>

        {destinationType !== 'hand_cash' && (
          <div className="space-y-2">
            <Label>Destination Account *</Label>
            <Select
              value={watch('destination_account_id') || ""}
              onValueChange={(val) => setValue('destination_account_id', val, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select destination account" />
              </SelectTrigger>
              <SelectContent>
                {destinationOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!watch('destination_account_id') && (
              <p className="text-xs text-danger">Destination account is required</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Return Date</Label>
          <Input type="date" {...register('created_at')} />
        </div>

        <Button type="submit" disabled={loading || amountValue > remaining} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Process Return
        </Button>
      </form>
    </div>
  );
}
