"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loanIssueSchema } from '@/utils/validators';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Loader2 } from 'lucide-react';
import { numberToWords } from '@/utils/numberToWords';

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function LoanIssueForm({
  members = [],
  motherAccounts = [],
  profitAccounts = [],
  onSubmit,
  loading = false,
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loanIssueSchema),
    defaultValues: {
      borrower_user_id: '',
      trn_id: '',
      amount: '',
      source_type: '',
      source_account_id: '',
      due_date: '',
      notes: '',
      created_at: getToday(),
    },
  });

  const sourceType = watch('source_type');
  const amountValue = watch('amount');
  const amountWords = numberToWords(amountValue);

  const getSourceAccounts = () => {
    switch (sourceType) {
      case 'mother_account':
        return motherAccounts.map((acc) => ({ id: acc.id, label: `${acc.name} (${acc.accountNumber})` }));
      case 'profit_account':
        return profitAccounts.map((acc) => ({ id: acc.id, label: acc.name }));
      default:
        return [];
    }
  };

  const handleFormSubmit = async (data) => {
    await onSubmit(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Borrower *</Label>
          <Select value={watch('borrower_user_id') || ""} onValueChange={(val) => setValue('borrower_user_id', val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select borrower" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  {m.profiles?.full_name || m.profiles?.email || m.user_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.borrower_user_id && (
            <p className="text-xs text-danger">{errors.borrower_user_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Amount *</Label>
          <Input
            type="number"
            step="0.01"
            {...register('amount', { valueAsNumber: true })}
            placeholder="0.00"
          />
          {amountWords && (
            <p className="text-xs text-[var(--color-primary)] italic">{amountWords}</p>
          )}
          {errors.amount && <p className="text-xs text-danger">{errors.amount.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>TRN ID</Label>
          <Input {...register('trn_id')} placeholder="Optional transaction id" />
        </div>

        <div className="space-y-2">
          <Label>Issue Date</Label>
          <Input type="date" {...register('created_at')} />
        </div>

        <div className="space-y-2">
          <Label>Source Type *</Label>
          <Select
            value={watch('source_type') || ""}
            onValueChange={(val) => {
              setValue('source_type', val);
              setValue('source_account_id', '');
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hand_cash">Hand Cash</SelectItem>
              <SelectItem value="mother_account">Mother Account</SelectItem>
              <SelectItem value="profit_account">Profit Account</SelectItem>
            </SelectContent>
          </Select>
          {errors.source_type && (
            <p className="text-xs text-danger">{errors.source_type.message}</p>
          )}
        </div>

        {sourceType && sourceType !== 'hand_cash' && (
          <div className="space-y-2">
            <Label>Source Account *</Label>
            <Select value={watch('source_account_id') || ""} onValueChange={(val) => setValue('source_account_id', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {getSourceAccounts().map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.source_account_id && (
              <p className="text-xs text-danger">{errors.source_account_id.message}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input type="date" {...register('due_date')} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Notes</Label>
          <Input {...register('notes')} placeholder="Loan details or purpose" />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full md:w-auto">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Issue Loan
      </Button>
    </form>
  );
}
