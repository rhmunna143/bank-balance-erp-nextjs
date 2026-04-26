"use client";

import { useState, useEffect, useRef } from "react";
import { useBank } from "@/hooks/useBank";
import { useAuthStore } from "@/stores/authStore";
import { BankForm } from "@/components/forms/BankForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { bankService } from "@/services/bankService";
import { backupService } from "@/services/backupService";
import {
  Settings,
  Save,
  Plus,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  HardDrive,
  RotateCcw,
  FileDown,
  FileUp,
} from "lucide-react";
import toast from "react-hot-toast";

export default function BankSettingsPage() {
  const { bank, categories, refreshBank } = useBank();
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadingSnapshot, setDownloadingSnapshot] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (bank?.id) fetchBackups();
  }, [bank?.id]);

  const fetchBackups = async () => {
    if (!bank?.id) return;
    setLoadingBackups(true);
    try {
      const data = await backupService.getBackups(bank.id);
      setBackups(data);
    } catch (error) {
      console.error("Failed to load backups:", error);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleUpdateBank = async (data) => {
    setSaving(true);
    try {
      await bankService.update(bank.id, data);
      await refreshBank();
      toast.success("Bank settings updated!");
    } catch (error) {
      toast.error(error.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    setAddingCategory(true);
    try {
      await bankService.addExpenseCategory(bank.id, newCategory.trim());
      await refreshBank();
      setNewCategory("");
      toast.success("Category added!");
    } catch (error) {
      toast.error("Failed to add category");
    } finally {
      setAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await bankService.deleteExpenseCategory(catId);
      await refreshBank();
      toast.success("Category deleted");
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  const handleCreateBackup = async () => {
    const label = `Backup - ${new Date().toLocaleString()}`;
    setCreatingBackup(true);
    try {
      await backupService.createBackup(bank.id, label, user.id);
      toast.success("Backup created! (Max 3 kept)");
      fetchBackups();
    } catch (error) {
      toast.error(error.message || "Failed to create backup");
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestore = async (backupId, backupLabel) => {
    if (
      !window.confirm(
        `Restore from "${backupLabel}"?\n\nThis will REPLACE all current data with the backup data. This cannot be undone.`
      )
    )
      return;
    setRestoringId(backupId);
    try {
      await backupService.restoreBackup(backupId, bank.id);
      await refreshBank();
      toast.success("Data restored from backup!");
    } catch (error) {
      toast.error(error.message || "Failed to restore backup");
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteBackup = async (backupId) => {
    if (!window.confirm("Delete this backup?")) return;
    try {
      await backupService.deleteBackup(backupId);
      toast.success("Backup deleted");
      fetchBackups();
    } catch (error) {
      toast.error("Failed to delete backup");
    }
  };

  const handleDownloadBackup = async (backupId) => {
    setDownloadingId(backupId);
    try {
      await backupService.downloadBackup(backupId, bank.name);
      toast.success("Backup file downloaded!");
    } catch (error) {
      toast.error(error.message || "Failed to download backup");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadSnapshot = async () => {
    setDownloadingSnapshot(true);
    try {
      await backupService.downloadCurrentSnapshot(bank.id, bank.name, user.id);
      toast.success("Snapshot downloaded!");
      fetchBackups();
    } catch (error) {
      toast.error(error.message || "Failed to download snapshot");
    } finally {
      setDownloadingSnapshot(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be selected again
    e.target.value = "";

    if (
      !window.confirm(
        "Restore from uploaded file?\n\nThis will REPLACE all current data. This cannot be undone."
      )
    )
      return;

    setUploadingFile(true);
    try {
      const text = await file.text();
      const backupData = backupService.parseBackupFile(text);
      await backupService.restoreFromFile(bank.id, backupData);
      await refreshBank();
      toast.success("Data restored from file!");
    } catch (error) {
      toast.error(error.message || "Failed to restore from file");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleResetAll = async () => {
    const confirmText = window.prompt(
      'This will DELETE all transactions, expenses, loans, loan return histories, daily logs and reset all account balances to 0.\n\nType "RESET" to confirm:'
    );
    if (confirmText !== "RESET") {
      if (confirmText !== null)
        toast.error("Reset cancelled — text did not match");
      return;
    }
    setResetting(true);
    try {
      await backupService.resetAllData(bank.id);
      await refreshBank();
      toast.success("All data has been reset");
    } catch (error) {
      toast.error(error.message || "Failed to reset data");
    } finally {
      setResetting(false);
    }
  };

  if (!bank) return <LoadingSpinner className="h-64" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bank Settings</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Configure your bank details and preferences
        </p>
      </div>

      {/* Bank Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-5 w-5" /> Bank Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BankForm
            defaultValues={{
              name: bank.name,
              currency: bank.currency,
              address: bank.address || "",
              phone: bank.phone || "",
            }}
            onSubmit={handleUpdateBank}
            loading={saving}
            isEdit
          />
        </CardContent>
      </Card>

      {/* Expense Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
            />
            <Button onClick={handleAddCategory} disabled={addingCategory}>
              <Plus className="mr-2 h-4 w-4" /> Add
            </Button>
          </div>
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between py-2 px-3 bg-[var(--color-surface)] rounded-lg"
              >
                <span className="text-sm">{cat.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-danger"
                  onClick={() => handleDeleteCategory(cat.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)]">
                No categories. Add one above.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Backup & Restore */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-5 w-5" /> Backup &amp; Restore
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            Create backups of all bank data. Up to 3 most recent backups are
            kept online. You can also download backups as files or restore from
            uploaded files.
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCreateBackup} disabled={creatingBackup}>
              <Download className="mr-2 h-4 w-4" />
              {creatingBackup ? "Creating..." : "Create Online Backup"}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadSnapshot}
              disabled={downloadingSnapshot}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {downloadingSnapshot ? "Downloading..." : "Download Backup File"}
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
            >
              <FileUp className="mr-2 h-4 w-4" />
              {uploadingFile ? "Restoring..." : "Restore from File"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {loadingBackups ? (
            <LoadingSpinner className="h-20" />
          ) : backups.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] py-4">
              No backups yet. Create one above.
            </p>
          ) : (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">
                Saved Backups ({backups.length}/3)
              </h4>
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between py-3 px-4 bg-[var(--color-surface)] rounded-lg border border-border"
                >
                  <div>
                    <p className="text-sm font-medium">{backup.label}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {new Date(backup.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadBackup(backup.id)}
                      disabled={downloadingId === backup.id}
                      title="Download as file"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleRestore(backup.id, backup.label)
                      }
                      disabled={restoringId === backup.id}
                    >
                      <Upload className="mr-1 h-3.5 w-3.5" />
                      {restoringId === backup.id ? "Restoring..." : "Restore"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger"
                      onClick={() => handleDeleteBackup(backup.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone - Reset */}
      <Card className="border-red-300">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
            <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
              Reset All Data
            </h4>
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">
              This will permanently delete all transactions, expenses, loans,
              loan return histories, and daily logs, and reset all account
              balances to zero. This action cannot be undone. Consider creating
              a backup first.
            </p>
            <Button
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50"
              onClick={handleResetAll}
              disabled={resetting}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {resetting ? "Resetting..." : "Reset All Data"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
