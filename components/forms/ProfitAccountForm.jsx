"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profitAccountSchema } from '@/utils/validators';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Loader2 } from 'lucide-react';

export function ProfitAccountForm({ defaultValues, onSubmit, loading = false, isEdit = false }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profitAccountSchema),
    defaultValues: defaultValues || {
      name: '',
      description: '',
      balance: 0,
    },
  });

  const handleFormSubmit = async (data) => {
    await onSubmit(data);
    if (!isEdit) reset();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Account Name *</Label>
          <Input {...register('name')} placeholder="e.g., Head Office Profit" />
          {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>{isEdit ? 'Balance' : 'Initial Balance'}</Label>
          <Input type="number" step="0.01" {...register('balance', { valueAsNumber: true })} />
          {errors.balance && <p className="text-xs text-danger">{errors.balance.message}</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Description</Label>
          <Input {...register('description')} placeholder="Optional description" />
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEdit ? 'Update Account' : 'Create Account'}
      </Button>
    </form>
  );
}
