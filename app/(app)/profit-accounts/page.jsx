"use client";

import { useState } from "react";
import { useProfitAccounts } from "@/hooks/useProfitAccounts";
import { useBank } from "@/hooks/useBank";
import { ProfitAccountForm } from "@/components/forms/ProfitAccountForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { formatCurrency } from "@/utils/currency";
import { TrendingUp, Plus, Edit2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ProfitAccountsPage() {
  const { accounts, loading, createAccount: create, updateAccount: update } = useProfitAccounts();
  const { currencySymbol } = useBank();
  const [showCreate, setShowCreate] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (data) => {
    setSubmitting(true);
    try {
      await create(data);
      setShowCreate(false);
      toast.success("Profit account created!");
    } catch (error) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data) => {
    setSubmitting(true);
    try {
      await update(editAccount.id, data);
      setEditAccount(null);
      toast.success("Account updated!");
    } catch (error) {
      toast.error(error.message || "Failed to update account");
    } finally {
      setSubmitting(false);
    }
  };

  const totalProfit = accounts.reduce(
    (sum, a) => sum + (a.balance || 0),
    0
  );

  if (loading) return <LoadingSpinner className="h-64" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profit Accounts</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Track service charges and commissions
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Account
        </Button>
      </div>

      {/* Total Profit Summary */}
      <Card className="bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-[var(--color-primary)]" />
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">
                Total Profit
              </p>
              <p className="text-3xl font-bold text-[var(--color-primary)]">
                {formatCurrency(totalProfit, currencySymbol)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {accounts.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No Profit Accounts"
          description="Create your first profit account to start tracking earnings."
          action={() => setShowCreate(true)}
          actionLabel="Create Account"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">
                  {account.name}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditAccount(account)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-success">
                  {formatCurrency(account.balance, currencySymbol)}
                </p>
                {account.description && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {account.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Profit Account</DialogTitle>
          </DialogHeader>
          <ProfitAccountForm onSubmit={handleCreate} loading={submitting} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editAccount} onOpenChange={() => setEditAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profit Account</DialogTitle>
          </DialogHeader>
          {editAccount && (
            <ProfitAccountForm
              defaultValues={editAccount}
              onSubmit={handleUpdate}
              loading={submitting}
              isEdit
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
