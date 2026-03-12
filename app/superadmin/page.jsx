"use client";

import { useEffect, useState } from "react";
import { superadminService } from "@/services/superadminService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Building2, Star, ToggleLeft, ToggleRight } from "lucide-react";
import toast from "react-hot-toast";

export default function SuperAdminDashboard() {
  const [banks, setBanks] = useState([]);
  const [rootBankId, setRootBankId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [bankList, rootBank] = await Promise.all([
        superadminService.listAllBanks(),
        superadminService.getRootBank(),
      ]);
      setBanks(bankList);
      setRootBankId(rootBank?.bank_id || null);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSetRoot = async (bankId) => {
    try {
      await superadminService.setRootBank(bankId);
      setRootBankId(bankId);
      toast.success("Root bank updated!");
    } catch (error) {
      toast.error(error.message || "Failed to set root bank");
    }
  };

  const handleToggleActive = async (bankId, currentState) => {
    try {
      await superadminService.toggleBankActive(bankId, !currentState);
      setBanks((prev) =>
        prev.map((b) =>
          b.id === bankId ? { ...b, is_active: !currentState } : b
        )
      );
      toast.success("Bank status updated!");
    } catch (error) {
      toast.error("Failed to update bank status");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-text)]">
          All Registered Banks
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Select which bank gets the root route (<code>/</code>) landing page.
        </p>
      </div>

      <div className="grid gap-4">
        {banks.map((bank) => (
          <Card key={bank.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <CardTitle className="text-lg">{bank.name}</CardTitle>
                {bank.id === rootBankId && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <Star className="h-3 w-3" /> Root
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-[var(--color-text-muted)] space-y-1">
                  <p>Slug: <code>/{bank.slug}</code></p>
                  <p>Owner: {bank.owner_email}</p>
                  <p>Currency: {bank.currency}</p>
                  <p>
                    Status:{" "}
                    <span className={bank.is_active ? "text-green-600" : "text-red-600"}>
                      {bank.is_active ? "Active" : "Inactive"}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(bank.id, bank.is_active)}
                  >
                    {bank.is_active ? (
                      <ToggleRight className="h-4 w-4 mr-1" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 mr-1" />
                    )}
                    {bank.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  {bank.id !== rootBankId && bank.is_active && (
                    <Button
                      size="sm"
                      onClick={() => handleSetRoot(bank.id)}
                    >
                      <Star className="h-4 w-4 mr-1" />
                      Set as Root
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
