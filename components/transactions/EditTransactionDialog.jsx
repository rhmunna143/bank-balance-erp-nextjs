"use client";

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { transactionService } from '@/services/transactionService';
import { Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Shared edit-transaction dialog.
 * Works for deposit, withdrawal, and cash_in transaction types.
 *
 * @param {Object}   props
 * @param {boolean}  props.open
 * @param {Function} props.onOpenChange
 * @param {Object}   props.transaction - The transaction record to edit
 * @param {Function} props.onSaved     - Called after successful save
 */
export function EditTransactionDialog({ open, onOpenChange, transaction, onSaved }) {
  const [form, setForm] = useState({ customer_name: '', customer_account: '', trn_id: '', amount: '', notes: '', source: '' });
  const [saving, setSaving] = useState(false);

  const isCashIn = transaction?.type === 'cash_in';

  useEffect(() => {
    if (transaction) {
      setForm({
        customer_name: transaction.customer_name || '',
        customer_account: transaction.customer_account || '',
        trn_id: transaction.trn_id || '',
        amount: transaction.amount || '',
        notes: transaction.notes || '',
        source: transaction.source || '',
      });
    }
  }, [transaction]);

  const handleSave = async () => {
    if (!transaction) return;
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    setSaving(true);
    try {
      await transactionService.updateTransaction(transaction.id, {
        customer_name: form.customer_name || null,
        customer_account: form.customer_account || null,
        trn_id: form.trn_id || null,
        amount: amt,
        notes: form.notes || null,
        source: form.source || null,
      });
      toast.success('Transaction updated successfully');
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      console.error('Failed to update transaction:', error);
      toast.error(error.message || 'Failed to update transaction');
    } finally {
      setSaving(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" /> Edit Transaction
          </DialogTitle>
          <DialogDescription>
            Update transaction details. Account balances will be adjusted automatically if the amount changes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
            <span className="text-sm text-[var(--color-text-muted)]">Type</span>
            <span className="text-sm font-bold capitalize">{transaction.type?.replace('_', ' ')}</span>
          </div>

          {!isCashIn && (
            <>
              <div>
                <Label>Customer Name</Label>
                <Input
                  value={form.customer_name}
                  onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input
                  value={form.customer_account}
                  onChange={(e) => setForm((f) => ({ ...f, customer_account: e.target.value }))}
                  placeholder="Account number"
                />
              </div>
            </>
          )}

          {isCashIn && (
            <div>
              <Label>Source</Label>
              <Input
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                placeholder="Cash-in source"
              />
            </div>
          )}

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
            <Label>TRN ID</Label>
            <Input
              value={form.trn_id}
              onChange={(e) => setForm((f) => ({ ...f, trn_id: e.target.value }))}
              placeholder="Optional transaction id"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes (optional)"
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
