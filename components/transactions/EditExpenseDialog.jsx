"use client";

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { expenseService } from '@/services/expenseService';
import { Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

export function EditExpenseDialog({ open, onOpenChange, expense, categories = [], onSaved }) {
  const [form, setForm] = useState({ amount: '', description: '', category_id: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expense) {
      setForm({
        amount: expense.amount || '',
        description: expense.description || '',
        category_id: expense.category_id || '',
      });
    }
  }, [expense]);

  const handleSave = async () => {
    if (!expense) return;
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    setSaving(true);
    try {
      await expenseService.updateExpense(expense.id, {
        amount: amt,
        description: form.description || null,
        category_id: form.category_id || null,
      });
      toast.success('Expense updated successfully');
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      console.error('Failed to update expense:', error);
      toast.error(error.message || 'Failed to update expense');
    } finally {
      setSaving(false);
    }
  };

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" /> Edit Expense
          </DialogTitle>
          <DialogDescription>
            Update expense details. Account balances will be adjusted automatically if the amount changes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
            <span className="text-sm text-[var(--color-text-muted)]">Deducted From</span>
            <span className="text-sm font-bold capitalize">{expense.deduct_from?.replace('_', ' ') || '-'}</span>
          </div>

          <div>
            <Label>Category</Label>
            <Select value={form.category_id} onValueChange={(val) => setForm((f) => ({ ...f, category_id: val }))}>
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
          </div>

          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              step="any"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="Amount"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
