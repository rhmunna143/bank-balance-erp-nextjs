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

export default function SiteSettingsPage() {
  const { bank, isAdmin, loading: bankLoading } = useBank();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState({
    site_name: "",
    tagline: "",
    logo_url: "",
    favicon_url: "",
    primary_color: "#1a56db",
    secondary_color: "#7c3aed",
    footer_text: "",
    contact_email: "",
    contact_phone: "",
    contact_address: "",
    facebook_url: "",
    twitter_url: "",
    linkedin_url: "",
    meta_title: "",
    meta_description: "",
  });

  useEffect(() => {
    if (!bank?.id) return;
    (async () => {
      try {
        const data = await landingService.getSettings(bank.id);
        if (data) {
          setSettings((prev) => ({ ...prev, ...data }));
        } else {
          setSettings((prev) => ({ ...prev, site_name: bank.name }));
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [bank?.id, bank?.name]);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await imageService.upload(file);
      handleChange(field, result.url);
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
      const { id, bank_id, created_at, updated_at, ...rest } = settings;
      await landingService.upsertSettings(bank.id, rest);
      toast.success("Settings saved");
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
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Site Settings</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Configure your landing page appearance</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Site Name</Label>
            <Input value={settings.site_name} onChange={(e) => handleChange("site_name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Tagline</Label>
            <Input value={settings.tagline || ""} onChange={(e) => handleChange("tagline", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={settings.primary_color}
                onChange={(e) => handleChange("primary_color", e.target.value)}
                className="h-10 w-14 rounded border border-border cursor-pointer"
              />
              <Input value={settings.primary_color} onChange={(e) => handleChange("primary_color", e.target.value)} className="flex-1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Secondary Color</Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={settings.secondary_color}
                onChange={(e) => handleChange("secondary_color", e.target.value)}
                className="h-10 w-14 rounded border border-border cursor-pointer"
              />
              <Input value={settings.secondary_color} onChange={(e) => handleChange("secondary_color", e.target.value)} className="flex-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Logo</Label>
            {settings.logo_url && (
              <img src={settings.logo_url} alt="Logo" className="h-12 object-contain mb-2" />
            )}
            <div className="flex gap-2">
              <Input value={settings.logo_url || ""} onChange={(e) => handleChange("logo_url", e.target.value)} placeholder="Logo URL" className="flex-1" />
              <Button variant="outline" size="sm" disabled={uploading} asChild>
                <label className="cursor-pointer">
                  <Upload className="h-4 w-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "logo_url")} />
                </label>
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Favicon</Label>
            {settings.favicon_url && (
              <img src={settings.favicon_url} alt="Favicon" className="h-8 object-contain mb-2" />
            )}
            <div className="flex gap-2">
              <Input value={settings.favicon_url || ""} onChange={(e) => handleChange("favicon_url", e.target.value)} placeholder="Favicon URL" className="flex-1" />
              <Button variant="outline" size="sm" disabled={uploading} asChild>
                <label className="cursor-pointer">
                  <Upload className="h-4 w-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "favicon_url")} />
                </label>
              </Button>
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Footer Text</Label>
            <Input value={settings.footer_text || ""} onChange={(e) => handleChange("footer_text", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={settings.contact_email || ""} onChange={(e) => handleChange("contact_email", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={settings.contact_phone || ""} onChange={(e) => handleChange("contact_phone", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Address</Label>
            <Input value={settings.contact_address || ""} onChange={(e) => handleChange("contact_address", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Social */}
      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Facebook</Label>
            <Input value={settings.facebook_url || ""} onChange={(e) => handleChange("facebook_url", e.target.value)} placeholder="https://facebook.com/..." />
          </div>
          <div className="space-y-2">
            <Label>Twitter / X</Label>
            <Input value={settings.twitter_url || ""} onChange={(e) => handleChange("twitter_url", e.target.value)} placeholder="https://twitter.com/..." />
          </div>
          <div className="space-y-2">
            <Label>LinkedIn</Label>
            <Input value={settings.linkedin_url || ""} onChange={(e) => handleChange("linkedin_url", e.target.value)} placeholder="https://linkedin.com/..." />
          </div>
        </CardContent>
      </Card>

      {/* SEO */}
      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label>Meta Title</Label>
            <Input value={settings.meta_title || ""} onChange={(e) => handleChange("meta_title", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Meta Description</Label>
            <Input value={settings.meta_description || ""} onChange={(e) => handleChange("meta_description", e.target.value)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
