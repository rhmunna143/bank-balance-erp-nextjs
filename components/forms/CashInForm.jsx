"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cashInSchema } from '@/utils/validators';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Loader2 } from 'lucide-react';
import { numberToWords } from '@/utils/numberToWords';

const EXTERNAL_SOURCES = ['Hand Cash', 'Head Office', 'Branch', 'Personal', 'Other'];

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function CashInForm({ motherAccounts = [], profitAccounts = [], handCashId, handCashBalance = 0, onSubmit, loading = false }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(cashInSchema),
    defaultValues: {
      target_type: '',
      target_id: '',
      trn_id: '',
      amount: '',
      source: '',
      reference: '',
      notes: '',
      created_at: getToday(),
    },
  });

  const targetType = watch('target_type');
  const sourceValue = watch('source');
  const isHandCashSource = sourceValue === 'Hand Cash';

  const getTargetOptions = () => {
    switch (targetType) {
      case 'mother_account':
        return motherAccounts.map((acc) => ({ id: acc.id, label: `${acc.name} (${acc.account_number})` }));
      case 'profit_account':
        return (profitAccounts || []).map((acc) => ({ id: acc.id, label: acc.name }));
      case 'hand_cash':
        return handCashId ? [{ id: handCashId, label: 'Hand Cash' }] : [];
      default:
        return [];
    }
  };

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
          <Label>Fund Into *</Label>
          <Select
            onValueChange={(val) => {
              setValue('target_type', val);
              setValue('target_id', '');
              if (val === 'hand_cash' && handCashId) {
                setValue('target_id', handCashId);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Which account to fund?" />
            </SelectTrigger>
            <SelectContent>
              {!isHandCashSource && <SelectItem value="hand_cash">Hand Cash</SelectItem>}
              <SelectItem value="mother_account">Mother Account</SelectItem>
              {!isHandCashSource && <SelectItem value="profit_account">Profit Account</SelectItem>}
            </SelectContent>
          </Select>
          {errors.target_type && (
            <p className="text-xs text-danger">{errors.target_type.message}</p>
          )}
        </div>

        {targetType && targetType !== 'hand_cash' && (
          <div className="space-y-2">
            <Label>Target Account *</Label>
            <Select onValueChange={(val) => setValue('target_id', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {getTargetOptions().map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.target_id && (
              <p className="text-xs text-danger">{errors.target_id.message}</p>
            )}
          </div>
        )}

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
          <Label>Source</Label>
          <Select onValueChange={(val) => {
            setValue('source', val);
            // If Hand Cash source selected and target is hand_cash, reset target
            if (val === 'Hand Cash' && (watch('target_type') === 'hand_cash' || watch('target_type') === 'profit_account')) {
              setValue('target_type', '');
              setValue('target_id', '');
            }
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Where is the money from?" />
            </SelectTrigger>
            <SelectContent>
              {EXTERNAL_SOURCES.map((src) => (
                <SelectItem key={src} value={src}>
                  {src}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isHandCashSource && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Hand Cash balance will be deducted
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Reference</Label>
          <Input {...register('reference')} placeholder="Transaction reference" />
        </div>

        <div className="space-y-2">
          <Label>TRN ID</Label>
          <Input {...register('trn_id')} placeholder="Optional transaction id" />
        </div>

        <div className="space-y-2">
          <Label>Transaction Date</Label>
          <Input type="date" {...register('created_at')} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Notes</Label>
          <Input {...register('notes')} placeholder="Optional notes" />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full md:w-auto">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Record Cash-In
      </Button>
    </form>
  );
}
