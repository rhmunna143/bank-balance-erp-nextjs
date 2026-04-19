"use client";

import { useState, useEffect, useCallback } from "react";
import { useBank } from "@/hooks/useBank";
import { LoanIssueForm } from "@/components/forms/LoanIssueForm";
import { LoanReturnForm } from "@/components/forms/LoanReturnForm";
import { LoanTable } from "@/components/tables/LoanTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { loanService } from "@/services/loanService";
import { userService } from "@/services/userService";
import { useHandCash } from "@/hooks/useHandCash";
import { useMotherAccounts } from "@/hooks/useMotherAccounts";
import { useProfitAccounts } from "@/hooks/useProfitAccounts";
import { useTransactionStore } from "@/stores/transactionStore";
import { ITEMS_PER_PAGE, LOAN_STATUSES } from "@/utils/constants";
import { HandCoins, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import toast from "react-hot-toast";

export default function LoansPage() {
  const { bank, isAdmin } = useBank();
  const { triggerRefresh } = useTransactionStore();
  const { handCash, refresh: refreshHC } = useHandCash();
  const { accounts: motherAccounts, refresh: refreshMA } = useMotherAccounts();
  const { accounts: profitAccounts, refresh: refreshPA } = useProfitAccounts();

  const [loans, setLoans] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");

  // Dialog states
  const [issueOpen, setIssueOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loanDetails, setLoanDetails] = useState(null);
  const [loanReturns, setLoanReturns] = useState([]);
  const [savingLoan, setSavingLoan] = useState(false);

  const fetchLoans = useCallback(async () => {
    if (!bank?.id) return;
    setLoading(true);
    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const filters = { limit: ITEMS_PER_PAGE, offset };
      if (statusFilter) filters.status = statusFilter;

      const { data, count } = await loanService.getAll(bank.id, filters);
      setLoans(data || []);
      setTotal(count || 0);
    } catch (error) {
      console.error("Failed to fetch loans:", error);
    } finally {
      setLoading(false);
    }
  }, [bank?.id, page, statusFilter]);

  const fetchMembers = useCallback(async () => {
    if (!bank?.id) return;
    try {
      const data = await userService.getMembers(bank.id);
      setMembers(data || []);
    } catch (error) {
      console.error("Failed to fetch members:", error);
    }
  }, [bank?.id]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleIssueLoan = async (data) => {
    setSubmitting(true);
    try {
      await loanService.issueLoan({
        bank_id: bank.id,
        borrower_user_id: data.borrower_user_id,
        trn_id: data.trn_id || null,
        amount: data.amount,
        source_type: data.source_type,
        source_account_id: data.source_account_id || null,
        due_date: data.due_date || null,
        notes: data.notes || null,
        created_at: data.created_at ? `${data.created_at}T12:00:00` : null,
      });
      toast.success("Loan issued successfully!");
      setIssueOpen(false);
      fetchLoans();
      refreshHC();
      refreshMA();
      refreshPA();
      triggerRefresh();
    } catch (error) {
      toast.error(error.message || "Failed to issue loan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnLoan = async (data) => {
    setSubmitting(true);
    try {
      await loanService.returnLoan({
        loan_id: data.loan_id,
        trn_id: data.trn_id || null,
        amount: data.amount,
        destination_type: data.destination_type,
        destination_account_id:
          data.destination_type === "hand_cash" ? null : data.destination_account_id || null,
        notes: data.notes || null,
        created_at: data.created_at ? `${data.created_at}T12:00:00` : null,
      });
      toast.success("Loan return processed!");
      setReturnOpen(false);
      setSelectedLoan(null);
      fetchLoans();
      refreshHC();
      refreshMA();
      refreshPA();
      triggerRefresh();
    } catch (error) {
      toast.error(error.message || "Failed to process return");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnClick = (loan) => {
    setSelectedLoan(loan);
    setReturnOpen(true);
  };

  const handleLoanSelect = async (loan) => {
    setLoanDetails({
      ...loan,
      due_date: loan.due_date || "",
      notes: loan.notes || "",
      trn_id: loan.trn_id || "",
    });
    setDetailsOpen(true);
    try {
      const returns = await loanService.getReturns(loan.id);
      setLoanReturns(returns || []);
    } catch {
      setLoanReturns([]);
    }
  };

  const handleLoanDetailsSave = async () => {
    if (!loanDetails?.id) return;
    setSavingLoan(true);
    try {
      await loanService.updateLoan(loanDetails.id, {
        due_date: loanDetails.due_date || null,
        notes: loanDetails.notes || null,
        trn_id: loanDetails.trn_id || null,
      });
      toast.success("Loan updated");
      setDetailsOpen(false);
      fetchLoans();
    } catch (error) {
      toast.error(error.message || "Failed to update loan");
    } finally {
      setSavingLoan(false);
    }
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Loans</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Manage short-term loans issued to members
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIssueOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Issue Loan
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val === "all" ? "" : val);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(LOAN_STATUSES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter("");
                setPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loans List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {total} Loan{total !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner className="h-48" />
          ) : loans.length === 0 ? (
            <EmptyState
              icon={HandCoins}
              title="No Loans Found"
              description="No loans match your current filters."
            />
          ) : (
            <>
              <LoanTable loans={loans} onReturn={handleReturnClick} onSelect={handleLoanSelect} />

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-border)]">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Issue Loan Dialog */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Issue New Loan</DialogTitle>
            <DialogDescription>
              Issue a short-term loan to a bank member. The amount will be deducted from the selected source.
            </DialogDescription>
          </DialogHeader>
          <LoanIssueForm
            members={members}
            motherAccounts={motherAccounts}
            profitAccounts={profitAccounts}
            onSubmit={handleIssueLoan}
            loading={submitting}
          />
        </DialogContent>
      </Dialog>

      {/* Return Loan Dialog */}
      <Dialog open={returnOpen} onOpenChange={(open) => { setReturnOpen(open); if (!open) setSelectedLoan(null); }}>
        <DialogContent className="w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Return Loan</DialogTitle>
            <DialogDescription>
              Process a full or partial loan return.
            </DialogDescription>
          </DialogHeader>
          {selectedLoan && (
            <LoanReturnForm
              loan={selectedLoan}
              motherAccounts={(motherAccounts || []).filter((a) => a.is_active)}
              profitAccounts={profitAccounts || []}
              onSubmit={handleReturnLoan}
              loading={submitting}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loan Details</DialogTitle>
            <DialogDescription>Review and edit selected loan metadata.</DialogDescription>
          </DialogHeader>
          {loanDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Borrower</Label>
                  <Input value={loanDetails.borrower?.full_name || ""} disabled />
                </div>
                <div>
                  <Label>Status</Label>
                  <Input value={LOAN_STATUSES[loanDetails.status] || loanDetails.status} disabled />
                </div>
                <div>
                  <Label>TRN ID</Label>
                  <Input
                    value={loanDetails.trn_id || ""}
                    onChange={(e) => setLoanDetails((prev) => ({ ...prev, trn_id: e.target.value }))}
                    placeholder="Optional transaction id"
                  />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={loanDetails.due_date || ""}
                    onChange={(e) => setLoanDetails((prev) => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={loanDetails.notes || ""}
                  onChange={(e) => setLoanDetails((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Loan notes"
                />
              </div>

              <div className="border rounded-lg p-3">
                <p className="text-sm font-medium mb-2">Loan Returns</p>
                {loanReturns.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)]">No return history yet.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-auto">
                    {loanReturns.map((ret) => (
                      <div key={ret.id} className="text-xs border-b pb-2">
                        <p>Amount: {ret.amount}</p>
                        <p>Date: {new Date(ret.created_at).toLocaleString()}</p>
                        <p>TRN: {ret.trn_id || "-"}</p>
                        <p>Destination: {ret.destination_type || "-"}</p>
                        {ret.destination_account_id && <p>Destination Account: {ret.destination_account_id}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
            <Button onClick={handleLoanDetailsSave} disabled={savingLoan}>
              {savingLoan ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
