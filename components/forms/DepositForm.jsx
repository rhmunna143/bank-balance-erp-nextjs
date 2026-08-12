"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { depositSchema } from '@/utils/validators';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Loader2 } from 'lucide-react';
import { numberToWords } from '@/utils/numberToWords';

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function DepositForm({ motherAccounts = [], onSubmit, loading = false }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      customer_account_no: '',
      trn_id: '',
      amount: '',
      mother_account_id: '',
      description: '',
      created_at: getToday(),
    },
  });

  const handleFormSubmit = async (data) => {
    await onSubmit(data);
    reset();
  };

  const amountValue = watch('amount');
  const amountWords = numberToWords(amountValue);

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
          <Label>TRN ID</Label>
          <Input {...register('trn_id')} placeholder="Optional transaction id" />
        </div>

        <div className="space-y-2">
          <Label>Transaction Date</Label>
          <Input type="date" {...register('created_at')} />
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
          <Label>Mother Account *</Label>
          <Select value={watch('mother_account_id') || ""} onValueChange={(val) => setValue('mother_account_id', val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {motherAccounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name} ({acc.accountNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.mother_account_id && (
            <p className="text-xs text-danger">{errors.mother_account_id.message}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Description</Label>
          <Input {...register('description')} placeholder="Optional description" />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full md:w-auto">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Record Deposit
      </Button>
    </form>
  );
}
