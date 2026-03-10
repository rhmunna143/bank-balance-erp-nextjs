"use client";

import { useState, useEffect, useCallback } from "react";
import { useBank } from "@/hooks/useBank";
import { landingService } from "@/services/landingService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ArrowLeft, Plus, Pencil, Trash2, Layers } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const ICON_OPTIONS = [
  "Banknote", "CreditCard", "Wallet", "PiggyBank", "TrendingUp", "Shield",
  "Users", "Landmark", "Globe", "Phone", "Mail", "Clock", "CheckCircle",
  "ArrowRightLeft", "Building2", "HandCoins", "Receipt", "FileBarChart",
  "Smartphone", "Lock", "Zap", "Target", "Award", "Star",
];

export default function ServicesEditorPage() {
  const { bank, isAdmin, loading: bankLoading } = useBank();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    icon_name: "Banknote",
    sort_order: 0,
    is_active: true,
  });

  // Also manage the section title/subtitle
  const [sectionMeta, setSectionMeta] = useState({ title: "Our Services", subtitle: "" });

  const fetchServices = useCallback(async () => {
    if (!bank?.id) return;
    setLoading(true);
    try {
      const [servicesData, sections] = await Promise.all([
        landingService.getServices(bank.id),
        landingService.getSections(bank.id),
      ]);
      setServices(servicesData || []);
      const svcSection = sections?.find((s) => s.section_key === "services");
      if (svcSection) {
        setSectionMeta({ title: svcSection.title || "Our Services", subtitle: svcSection.subtitle || "" });
      }
    } catch (err) {
      console.error("Failed to load services:", err);
    } finally {
      setLoading(false);
    }
  }, [bank?.id]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const openCreateDialog = () => {
    setEditingService(null);
    setForm({ title: "", description: "", icon_name: "Banknote", sort_order: services.length, is_active: true });
    setDialogOpen(true);
  };

  const openEditDialog = (service) => {
    setEditingService(service);
    setForm({
      title: service.title,
      description: service.description || "",
      icon_name: service.icon_name || "Banknote",
      sort_order: service.sort_order || 0,
      is_active: service.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      if (editingService) {
        await landingService.updateService(editingService.id, form);
        toast.success("Service updated");
      } else {
        await landingService.createService({ bank_id: bank.id, ...form });
        toast.success("Service created");
      }
      setDialogOpen(false);
      fetchServices();
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await landingService.deleteService(deleteId);
      toast.success("Service deleted");
      setDeleteId(null);
      fetchServices();
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const handleSaveSectionMeta = async () => {
    try {
      await landingService.upsertSection(bank.id, "services", {
        title: sectionMeta.title,
        subtitle: sectionMeta.subtitle,
        is_active: true,
      });
      toast.success("Section header saved");
    } catch (err) {
      toast.error(err.message || "Failed to save");
    }
  };

  if (bankLoading || loading) return <LoadingSpinner />;
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[var(--color-text-muted)]">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Services</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Manage service cards on the landing page</p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Section title/subtitle */}
      <Card>
        <CardHeader>
          <CardTitle>Section Header</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Section Title</Label>
              <Input value={sectionMeta.title} onChange={(e) => setSectionMeta((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Section Subtitle</Label>
              <Input value={sectionMeta.subtitle} onChange={(e) => setSectionMeta((p) => ({ ...p, subtitle: e.target.value }))} />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleSaveSectionMeta}>
            Save Header
          </Button>
        </CardContent>
      </Card>

      {/* Services list */}
      {services.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No services yet"
          description="Add service cards to showcase on your landing page."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((svc) => (
            <Card key={svc.id} className={!svc.is_active ? "opacity-50" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{svc.title}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(svc)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(svc.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--color-text-muted)]">{svc.description}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <span>Icon: {svc.icon_name}</span>
                  <span>•</span>
                  <span>Order: {svc.sort_order}</span>
                  {!svc.is_active && <span className="text-amber-500 font-medium">• Inactive</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Service" : "Add Service"}</DialogTitle>
            <DialogDescription>
              {editingService ? "Update this service card." : "Add a new service card to your landing page."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <select
                value={form.icon_name}
                onChange={(e) => setForm((p) => ({ ...p, icon_name: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {ICON_OPTIONS.map((icon) => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Active</Label>
                <div className="pt-2">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingService ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Service"
        description="Are you sure you want to delete this service? This action cannot be undone."
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
