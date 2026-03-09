"use client";

import { useState } from "react";
import { useMotherAccounts } from "@/hooks/useMotherAccounts";
import { useBank } from "@/hooks/useBank";
import { MotherAccountForm } from "@/components/forms/MotherAccountForm";
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
import { Building2, Plus, Edit2, Power } from "lucide-react";
import toast from "react-hot-toast";

export default function MotherAccountsPage() {
  const { accounts, loading, create, update, toggleActive } =
    useMotherAccounts();
  const { currencySymbol, isAdmin } = useBank();
  const [showCreate, setShowCreate] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (data) => {
    setSubmitting(true);
    try {
      await create(data);
      setShowCreate(false);
      toast.success("Mother account created!");
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

  const handleToggleActive = async (account) => {
    try {
      await toggleActive(account.id, !account.is_active);
      toast.success(
        `Account ${account.is_active ? "deactivated" : "activated"}!`
      );
    } catch (error) {
      toast.error("Failed to update account status");
    }
  };

  if (loading) return <LoadingSpinner className="h-64" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mother Accounts</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {isAdmin
              ? "Manage your mother accounts"
              : "View mother account balances"}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Account
          </Button>
        )}
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No Mother Accounts"
          description="Create your first mother account to start recording transactions."
          action={() => setShowCreate(true)}
          actionLabel="Create Account"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <Card
              key={account.id}
              className={!account.is_active ? "opacity-60" : ""}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">
                  {account.name}
                </CardTitle>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditAccount(account)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggleActive(account)}
                    >
                      <Power
                        className={`h-4 w-4 ${
                          account.is_active ? "text-success" : "text-danger"
                        }`}
                      />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[var(--color-text-muted)] mb-2">
                  {account.account_number}
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(account.balance, currencySymbol)}
                </p>
                {account.low_threshold > 0 && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">
                    Low threshold:{" "}
                    {formatCurrency(account.low_threshold, currencySymbol)}
                  </p>
                )}
                <span
                  className={`inline-block mt-2 text-xs rounded-full px-2 py-0.5 ${
                    account.is_active
                      ? "bg-success/10 text-success"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {account.is_active ? "Active" : "Inactive"}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Mother Account</DialogTitle>
          </DialogHeader>
          <MotherAccountForm onSubmit={handleCreate} loading={submitting} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editAccount} onOpenChange={() => setEditAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Mother Account</DialogTitle>
          </DialogHeader>
          {editAccount && (
            <MotherAccountForm
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
