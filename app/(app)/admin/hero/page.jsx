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

export default function HeroEditorPage() {
  const { bank, isAdmin, loading: bankLoading } = useBank();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [section, setSection] = useState({
    title: "Your Trusted Banking Partner",
    subtitle: "Empowering communities through accessible and reliable agent banking services.",
    image_url: "",
    content: { cta_text: "Get Started", cta_link: "/login" },
  });

  useEffect(() => {
    if (!bank?.id) return;
    (async () => {
      try {
        const sections = await landingService.getSections(bank.id);
        const hero = sections?.find((s) => s.section_key === "hero");
        if (hero) {
          setSection({
            title: hero.title || "",
            subtitle: hero.subtitle || "",
            image_url: hero.image_url || "",
            content: hero.content || { cta_text: "Get Started", cta_link: "/login" },
          });
        }
      } catch (err) {
        console.error("Failed to load hero:", err);
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
      await landingService.upsertSection(bank.id, "hero", {
        title: section.title,
        subtitle: section.subtitle,
        image_url: section.image_url,
        content: section.content,
        is_active: true,
      });
      toast.success("Hero section saved");
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
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Hero Section</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Edit the hero banner on your landing page</p>
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>CTA Button Text</Label>
              <Input value={section.content?.cta_text || ""} onChange={(e) => handleContentChange("cta_text", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>CTA Button Link</Label>
              <Input value={section.content?.cta_link || ""} onChange={(e) => handleContentChange("cta_link", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Background Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {section.image_url && (
            <div className="relative rounded-lg overflow-hidden border border-border">
              <img src={section.image_url} alt="Hero background" className="w-full h-48 object-cover" />
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={section.image_url}
              onChange={(e) => handleChange("image_url", e.target.value)}
              placeholder="Background image URL"
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

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="relative rounded-lg overflow-hidden h-64 flex items-center justify-center"
            style={{
              backgroundImage: section.image_url ? `url(${section.image_url})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: section.image_url ? undefined : "#1e3a5f",
            }}
          >
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative z-10 text-center text-white px-4">
              <h2 className="text-2xl font-bold mb-2">{section.title || "Hero Title"}</h2>
              <p className="text-sm opacity-90 mb-4">{section.subtitle || "Subtitle"}</p>
              <span className="inline-block bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-medium">
                {section.content?.cta_text || "CTA"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
