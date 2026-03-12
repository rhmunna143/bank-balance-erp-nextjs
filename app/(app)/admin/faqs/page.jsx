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
import { ArrowLeft, Plus, Pencil, Trash2, HelpCircle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function FAQsEditorPage() {
  const { bank, isAdmin, loading: bankLoading } = useBank();
  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    question: "",
    answer: "",
    sort_order: 0,
    is_active: true,
  });

  const [sectionMeta, setSectionMeta] = useState({ title: "Frequently Asked Questions", subtitle: "" });

  const fetchData = useCallback(async () => {
    if (!bank?.id) return;
    setLoading(true);
    try {
      const [data, sections] = await Promise.all([
        landingService.getFaqs(bank.id),
        landingService.getSections(bank.id),
      ]);
      setFaqs(data || []);
      const sec = sections?.find((s) => s.section_key === "faq");
      if (sec) {
        setSectionMeta({ title: sec.title || "Frequently Asked Questions", subtitle: sec.subtitle || "" });
      }
    } catch (err) {
      console.error("Failed to load FAQs:", err);
    } finally {
      setLoading(false);
    }
  }, [bank?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm({ question: "", answer: "", sort_order: faqs.length, is_active: true });
    setDialogOpen(true);
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setForm({
      question: item.question,
      answer: item.answer,
      sort_order: item.sort_order || 0,
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error("Question and answer are required");
      return;
    }
    setSaving(true);
    try {
      if (editingItem) {
        await landingService.updateFaq(editingItem.id, form);
        toast.success("FAQ updated");
      } else {
        await landingService.createFaq({ bank_id: bank.id, ...form });
        toast.success("FAQ created");
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
      await landingService.deleteFaq(deleteId);
      toast.success("FAQ deleted");
      setDeleteId(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const handleSaveSectionMeta = async () => {
    try {
      await landingService.upsertSection(bank.id, "faq", {
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
            <h1 className="text-2xl font-bold text-[var(--color-text)]">FAQs</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Manage frequently asked questions</p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add FAQ
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
      {faqs.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="No FAQs yet"
          description="Add frequently asked questions to help visitors."
        />
      ) : (
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <Card key={faq.id} className={!faq.is_active ? "opacity-50" : ""}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[var(--color-text)]">{faq.question}</p>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1 line-clamp-2">{faq.answer}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-[var(--color-text-muted)]">
                      <span>Order: {faq.sort_order}</span>
                      {!faq.is_active && <span className="text-amber-500 font-medium">• Inactive</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(faq)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(faq.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit FAQ" : "Add FAQ"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update this FAQ entry." : "Add a new frequently asked question."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Question</Label>
              <Input value={form.question} onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Answer</Label>
              <textarea
                value={form.answer}
                onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))}
                rows={4}
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
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
              {saving ? "Saving..." : editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete FAQ"
        description="Are you sure you want to delete this FAQ?"
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
