"use client";

import { useState, useEffect } from "react";
import { useBank } from "@/hooks/useBank";
import { landingService } from "@/services/landingService";
import { imageService } from "@/services/imageService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ArrowLeft, Save, Upload } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function AboutEditorPage() {
  const { bank, isAdmin, loading: bankLoading } = useBank();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [section, setSection] = useState({
    title: "About Us",
    subtitle: "Building trust through reliable banking services",
    image_url: "",
    content: {
      description: "",
      mission: "",
      vision: "",
    },
  });

  useEffect(() => {
    if (!bank?.id) return;
    (async () => {
      try {
        const sections = await landingService.getSections(bank.id);
        const about = sections?.find((s) => s.section_key === "about");
        if (about) {
          setSection({
            title: about.title || "About Us",
            subtitle: about.subtitle || "",
            image_url: about.image_url || "",
            content: about.content || { description: "", mission: "", vision: "" },
          });
        }
      } catch (err) {
        console.error("Failed to load about:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [bank?.id]);

  const handleChange = (field, value) => {
    setSection((prev) => ({ ...prev, [field]: value }));
  };

  const handleContentChange = (field, value) => {
    setSection((prev) => ({
      ...prev,
      content: { ...prev.content, [field]: value },
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await imageService.upload(file);
      handleChange("image_url", result.url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await landingService.upsertSection(bank.id, "about", {
        title: section.title,
        subtitle: section.subtitle,
        image_url: section.image_url,
        content: section.content,
        is_active: true,
      });
      toast.success("About section saved");
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
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
            <h1 className="text-2xl font-bold text-[var(--color-text)]">About Section</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Edit the about section on your landing page</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={section.title} onChange={(e) => handleChange("title", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Input value={section.subtitle} onChange={(e) => handleChange("subtitle", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              value={section.content?.description || ""}
              onChange={(e) => handleContentChange("description", e.target.value)}
              rows={4}
              className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Mission</Label>
              <textarea
                value={section.content?.mission || ""}
                onChange={(e) => handleContentChange("mission", e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <Label>Vision</Label>
              <textarea
                value={section.content?.vision || ""}
                onChange={(e) => handleContentChange("vision", e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {section.image_url && (
            <div className="rounded-lg overflow-hidden border border-border">
              <img src={section.image_url} alt="About" className="w-full h-48 object-cover" />
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={section.image_url}
              onChange={(e) => handleChange("image_url", e.target.value)}
              placeholder="Image URL"
              className="flex-1"
            />
            <Button variant="outline" disabled={uploading} asChild>
              <label className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Uploading..." : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
