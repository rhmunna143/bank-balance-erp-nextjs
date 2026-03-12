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
import { ArrowLeft, Plus, Pencil, Trash2, MessageSquareQuote, Star } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function TestimonialsEditorPage() {
  const { bank, isAdmin, loading: bankLoading } = useBank();
  const [loading, setLoading] = useState(true);
  const [testimonials, setTestimonials] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    designation: "",
    quote: "",
    rating: 5,
    avatar_url: "",
    sort_order: 0,
    is_active: true,
  });

  const [sectionMeta, setSectionMeta] = useState({ title: "What Our Customers Say", subtitle: "" });

  const fetchData = useCallback(async () => {
    if (!bank?.id) return;
    setLoading(true);
    try {
      const [data, sections] = await Promise.all([
        landingService.getTestimonials(bank.id),
        landingService.getSections(bank.id),
      ]);
      setTestimonials(data || []);
      const sec = sections?.find((s) => s.section_key === "testimonials");
      if (sec) {
        setSectionMeta({ title: sec.title || "What Our Customers Say", subtitle: sec.subtitle || "" });
      }
    } catch (err) {
      console.error("Failed to load testimonials:", err);
    } finally {
      setLoading(false);
    }
  }, [bank?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm({ name: "", designation: "", quote: "", rating: 5, avatar_url: "", sort_order: testimonials.length, is_active: true });
    setDialogOpen(true);
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      designation: item.designation || "",
      quote: item.quote,
      rating: item.rating || 5,
      avatar_url: item.avatar_url || "",
      sort_order: item.sort_order || 0,
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.quote.trim()) {
      toast.error("Name and quote are required");
      return;
    }
    setSaving(true);
    try {
      if (editingItem) {
        await landingService.updateTestimonial(editingItem.id, form);
        toast.success("Testimonial updated");
      } else {
        await landingService.createTestimonial({ bank_id: bank.id, ...form });
        toast.success("Testimonial created");
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await landingService.deleteTestimonial(deleteId);
      toast.success("Testimonial deleted");
      setDeleteId(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const handleSaveSectionMeta = async () => {
    try {
      await landingService.upsertSection(bank.id, "testimonials", {
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
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Testimonials</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Manage customer testimonials</p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Testimonial
        </Button>
      </div>

      {/* Section header */}
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

      {/* List */}
      {testimonials.length === 0 ? (
        <EmptyState
          icon={MessageSquareQuote}
          title="No testimonials yet"
          description="Add customer testimonials to build trust on your landing page."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.id} className={!t.is_active ? "opacity-50" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {t.avatar_url ? (
                      <img src={t.avatar_url} alt={t.name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {t.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{t.name}</p>
                      {t.designation && <p className="text-xs text-[var(--color-text-muted)]">{t.designation}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(t.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
                <div className="flex mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < t.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                  ))}
                </div>
                <p className="text-sm text-[var(--color-text-muted)] italic line-clamp-3">&ldquo;{t.quote}&rdquo;</p>
                {!t.is_active && <p className="text-xs text-amber-500 font-medium mt-2">Inactive</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Testimonial" : "Add Testimonial"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update this testimonial." : "Add a new customer testimonial."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input value={form.designation} onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))} placeholder="e.g., Business Owner" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quote</Label>
              <textarea
                value={form.quote}
                onChange={(e) => setForm((p) => ({ ...p, quote: e.target.value }))}
                rows={3}
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
            </div>
            <div className="grid gap-4 grid-cols-3">
              <div className="space-y-2">
                <Label>Rating (1-5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={form.rating}
                  onChange={(e) => setForm((p) => ({ ...p, rating: Math.min(5, Math.max(1, parseInt(e.target.value) || 1)) }))}
                />
              </div>
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
            <div className="space-y-2">
              <Label>Avatar URL (optional)</Label>
              <Input value={form.avatar_url} onChange={(e) => setForm((p) => ({ ...p, avatar_url: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Testimonial"
        description="Are you sure you want to delete this testimonial?"
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
