"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { fundTransferSchema } from "@/utils/validators";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { numberToWords } from "@/utils/numberToWords";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function FundTransferForm({
  motherAccounts = [],
  profitAccounts = [],
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
    resolver: zodResolver(fundTransferSchema),
    defaultValues: {
      trn_id: "",
      amount: "",
      source_type: "",
      source_account_id: "",
      destination_type: "",
      destination_account_id: "",
      destination_name: "",
      destination_account: "",
      notes: "",
      created_at: getToday(),
    },
  });

  const sourceType = watch("source_type");
  const destinationType = watch("destination_type");
  const amountWords = numberToWords(watch("amount"));

  const getOptions = (type) => {
    if (type === "mother_account") {
      return motherAccounts.map((a) => ({ id: a.id, label: `${a.name} (${a.accountNumber})` }));
    }
    if (type === "profit_account") {
      return profitAccounts.map((a) => ({ id: a.id, label: a.name }));
    }
    return [];
  };

  const submit = async (data) => {
    await onSubmit(data);
    reset({
      trn_id: "",
      amount: "",
      source_type: "",
      source_account_id: "",
      destination_type: "",
      destination_account_id: "",
      destination_name: "",
      destination_account: "",
      notes: "",
      created_at: getToday(),
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>TRN ID</Label>
          <Input {...register("trn_id")} placeholder="Optional transfer id" />
        </div>
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" {...register("created_at")} />
        </div>

        <div className="space-y-2">
          <Label>Source Type *</Label>
          <Select
            onValueChange={(val) => {
              setValue("source_type", val);
              setValue("source_account_id", "");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hand_cash">Hand Cash</SelectItem>
              <SelectItem value="mother_account">Mother Account</SelectItem>
              <SelectItem value="profit_account">Profit Account</SelectItem>
            </SelectContent>
          </Select>
          {errors.source_type && <p className="text-xs text-danger">{errors.source_type.message}</p>}
        </div>

        {sourceType && sourceType !== "hand_cash" && (
          <div className="space-y-2">
            <Label>Source Account *</Label>
            <Select value={watch("source_account_id") || ""} onValueChange={(val) => setValue("source_account_id", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select source account" />
              </SelectTrigger>
              <SelectContent>
                {getOptions(sourceType).map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Destination Type *</Label>
          <Select
            onValueChange={(val) => {
              setValue("destination_type", val);
              setValue("destination_account_id", "");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select destination" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hand_cash">Hand Cash</SelectItem>
              <SelectItem value="mother_account">Mother Account</SelectItem>
              <SelectItem value="profit_account">Profit Account</SelectItem>
              <SelectItem value="external_holder">Other Account Holder</SelectItem>
            </SelectContent>
          </Select>
          {errors.destination_type && <p className="text-xs text-danger">{errors.destination_type.message}</p>}
        </div>

        {destinationType && destinationType !== "hand_cash" && destinationType !== "external_holder" && (
          <div className="space-y-2">
            <Label>Destination Account *</Label>
            <Select onValueChange={(val) => setValue("destination_account_id", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination account" />
              </SelectTrigger>
              <SelectContent>
                {getOptions(destinationType).map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {destinationType === "external_holder" && (
          <>
            <div className="space-y-2">
              <Label>Holder Name</Label>
              <Input {...register("destination_name")} placeholder="Recipient name" />
            </div>
            <div className="space-y-2">
              <Label>Holder Account</Label>
              <Input {...register("destination_account")} placeholder="Recipient account number" />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label>Amount *</Label>
          <Input type="number" step="0.01" {...register("amount", { valueAsNumber: true })} placeholder="0.00" />
          {amountWords && (
            <p className="text-xs text-[var(--color-primary)] italic">{amountWords}</p>
          )}
          {errors.amount && <p className="text-xs text-danger">{errors.amount.message}</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Notes</Label>
          <Input {...register("notes")} placeholder="Optional transfer notes" />
        </div>
      </div>

      <Button type="submit" disabled={loading}>{loading ? "Processing..." : "Transfer Funds"}</Button>
    </form>
  );
}
