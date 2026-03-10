"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useBank } from "@/hooks/useBank";
import { BankForm } from "@/components/forms/BankForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import toast from "react-hot-toast";

export default function CreateBankPage() {
  const { user } = useAuth();
  const { createBank } = useBank();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      await createBank(data, user.id);
      toast.success("Bank created successfully!");
      router.push("/dashboard");
    } catch (error) {
      toast.error(error.message || "Failed to create bank");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
      <div className="w-full max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Set Up Your Bank</CardTitle>
            <CardDescription>
              Create your agent banking outlet to start managing financial
              operations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BankForm onSubmit={handleSubmit} loading={loading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
