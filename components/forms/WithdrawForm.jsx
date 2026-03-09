"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { withdrawalSchema } from '@/utils/validators';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Loader2, AlertTriangle } from 'lucide-react';
import { numberToWords } from '@/utils/numberToWords';

export function WithdrawForm({ motherAccounts = [], handCashBalance = 0, onSubmit, loading = false, currencySymbol = '৳' }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      customer_account_no: '',
      amount: '',
      mother_account_id: '',
      shortage_enabled: false,
      shortage_mother_account_id: '',
      shortage_deduction_amount: '',
      description: '',
    },
  });

  const amount = watch('amount');
  const shortageEnabled = watch('shortage_enabled');
  const hasShortage = amount && parseFloat(amount) > handCashBalance;

  const handleFormSubmit = async (data) => {
    await onSubmit(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Customer Name *</Label>
          <Input {...register('customer_name')} placeholder="Enter customer name" />
          {errors.customer_name && (
            <p className="text-xs text-danger">{errors.customer_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Customer Phone</Label>
          <Input {...register('customer_phone')} placeholder="Phone number" />
        </div>

        <div className="space-y-2">
          <Label>Customer Account No</Label>
          <Input {...register('customer_account_no')} placeholder="Account number" />
        </div>

        <div className="space-y-2">
          <Label>Amount *</Label>
          <Input
            type="number"
            step="0.01"
            {...register('amount', { valueAsNumber: true })}
            placeholder="0.00"
          />
          {numberToWords(amount) && (
            <p className="text-xs text-[var(--color-primary)] italic">{numberToWords(amount)}</p>
          )}
          {errors.amount && <p className="text-xs text-danger">{errors.amount.message}</p>}
          <p className="text-xs text-[var(--color-text-muted)]">
            Hand Cash Available: {currencySymbol}{handCashBalance.toFixed(2)}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Mother Account *</Label>
          <Select onValueChange={(val) => setValue('mother_account_id', val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {motherAccounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name} ({acc.account_number})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.mother_account_id && (
            <p className="text-xs text-danger">{errors.mother_account_id.message}</p>
          )}
        </div>

        {hasShortage && (
          <div className="md:col-span-2 rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div className="flex-1">
                <p className="text-sm font-medium">Hand Cash Shortage</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Withdrawal amount ({currencySymbol}{parseFloat(amount).toFixed(2)}) exceeds hand cash ({currencySymbol}{handCashBalance.toFixed(2)}).
                  Enable shortage mode to cover the difference from a mother account.
                </p>
              </div>
              <Switch
                checked={shortageEnabled}
                onCheckedChange={(checked) => setValue('shortage_enabled', checked)}
              />
            </div>

            {shortageEnabled && (
              <div className="space-y-3 pt-2 border-t border-warning/20">
                <div className="space-y-2">
                  <Label>Deduct From Mother Account *</Label>
                  <Select onValueChange={(val) => setValue('shortage_mother_account_id', val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mother account" />
                    </SelectTrigger>
                    <SelectContent>
                      {motherAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} ({acc.account_number}) — {currencySymbol}{parseFloat(acc.balance).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount to Deduct from Mother Account *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('shortage_deduction_amount', { valueAsNumber: true })}
                    placeholder="Enter amount to cash out from mother account"
                  />
                  {numberToWords(watch('shortage_deduction_amount')) && (
                    <p className="text-xs text-[var(--color-primary)] italic">{numberToWords(watch('shortage_deduction_amount'))}</p>
                  )}
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Hand cash will decrease by: {currencySymbol}
                    {(parseFloat(amount || 0) - parseFloat(watch('shortage_deduction_amount') || 0)).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2 md:col-span-2">
          <Label>Description</Label>
          <Input {...register('description')} placeholder="Optional description" />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading || (hasShortage && !shortageEnabled)}
        className="w-full md:w-auto"
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Record Withdrawal
      </Button>
    </form>
  );
}
