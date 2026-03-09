"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { expenseSchema } from '@/utils/validators';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Loader2 } from 'lucide-react';
import { numberToWords } from '@/utils/numberToWords';

export function ExpenseForm({
  categories = [],
  motherAccounts = [],
  profitAccounts = [],
  handCashId,
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
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category_id: '',
      amount: '',
      particulars: '',
      deducted_from_type: '',
      deducted_from_id: '',
    },
  });

  const deductedFromType = watch('deducted_from_type');
  const selectedCategory = watch('category_id');
  const isOther = categories.find((c) => c.id === selectedCategory)?.name === 'Other';

  const getDeductionOptions = () => {
    switch (deductedFromType) {
      case 'profit_account':
        return profitAccounts.map((acc) => ({ id: acc.id, label: acc.name }));
      case 'mother_account':
        return motherAccounts.map((acc) => ({ id: acc.id, label: `${acc.name} (${acc.account_number})` }));
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
          <Label>Category *</Label>
          <Select onValueChange={(val) => setValue('category_id', val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category_id && (
            <p className="text-xs text-danger">{errors.category_id.message}</p>
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

        <div className="space-y-2 md:col-span-2">
          <Label>{isOther ? 'Particulars *' : 'Particulars'}</Label>
          <Input {...register('particulars')} placeholder="Details about the expense" />
        </div>

        <div className="space-y-2">
          <Label>Deduct From *</Label>
          <Select
            onValueChange={(val) => {
              setValue('deducted_from_type', val);
              setValue('deducted_from_id', '');
              if (val === 'hand_cash' && handCashId) {
                setValue('deducted_from_id', handCashId);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="profit_account">Profit Account</SelectItem>
              <SelectItem value="mother_account">Mother Account</SelectItem>
              <SelectItem value="hand_cash">Hand Cash</SelectItem>
            </SelectContent>
          </Select>
          {errors.deducted_from_type && (
            <p className="text-xs text-danger">{errors.deducted_from_type.message}</p>
          )}
        </div>

        {deductedFromType && deductedFromType !== 'hand_cash' && (
          <div className="space-y-2">
            <Label>Account *</Label>
            <Select onValueChange={(val) => setValue('deducted_from_id', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {getDeductionOptions().map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.deducted_from_id && (
              <p className="text-xs text-danger">{errors.deducted_from_id.message}</p>
            )}
          </div>
        )}
      </div>

      <Button type="submit" disabled={loading} className="w-full md:w-auto">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Record Expense
      </Button>
    </form>
  );
}
