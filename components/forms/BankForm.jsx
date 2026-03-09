"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBankSchema } from '@/utils/validators';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { CURRENCIES } from '@/utils/constants';
import { Loader2 } from 'lucide-react';

export function BankForm({ onSubmit, loading = false, defaultValues }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createBankSchema),
    defaultValues: defaultValues || {
      name: '',
      currency: 'BDT',
      currencySymbol: '৳',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Bank Name *</Label>
        <Input {...register('name')} placeholder="Enter your bank name" />
        {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Currency *</Label>
        <Select
          defaultValue="BDT"
          onValueChange={(val) => {
            setValue('currency', val);
            const currency = CURRENCIES.find((c) => c.code === val);
            if (currency) setValue('currencySymbol', currency.symbol);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.symbol} {c.name} ({c.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.currency && <p className="text-xs text-danger">{errors.currency.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Currency Symbol</Label>
        <Input {...register('currencySymbol')} />
        {errors.currencySymbol && (
          <p className="text-xs text-danger">{errors.currencySymbol.message}</p>
        )}
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {defaultValues ? 'Update Bank' : 'Create Bank'}
      </Button>
    </form>
  );
}
