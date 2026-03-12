"use client";

import { useState, useEffect, useCallback } from "react";
import { useBank } from "@/hooks/useBank";
import { landingService } from "@/services/landingService";
import { imageService } from "@/services/imageService";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
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
import { ArrowLeft, Plus, Trash2, ImageIcon, Upload, Copy } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function GalleryPage() {
  const { bank, isAdmin, loading: bankLoading } = useBank();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: "", alt_text: "", section_key: "" });
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchImages = useCallback(async () => {
    if (!bank?.id) return;
    setLoading(true);
    try {
      const data = await landingService.getImages(bank.id);
      setImages(data || []);
    } catch (err) {
      console.error("Failed to load images:", err);
    } finally {
      setLoading(false);
    }
  }, [bank?.id]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select an image");
      return;
    }
    setUploading(true);
    try {
      const result = await imageService.upload(selectedFile);
      await landingService.addImage({
        bank_id: bank.id,
        name: uploadForm.name || selectedFile.name,
        image_url: result.url,
        delete_url: result.delete_url,
        alt_text: uploadForm.alt_text || "",
        section_key: uploadForm.section_key || null,
        sort_order: images.length,
      });
      toast.success("Image uploaded");
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadForm({ name: "", alt_text: "", section_key: "" });
      fetchImages();
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await landingService.deleteImage(deleteId);
      toast.success("Image deleted");
      setDeleteId(null);
      fetchImages();
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
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
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Image Gallery</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Upload and manage images for your landing page</p>
          </div>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Image
        </Button>
      </div>

      {images.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No images yet"
          description="Upload images to use across your landing page sections."
        />
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <Card key={img.id} className="overflow-hidden">
              <div className="aspect-square relative group">
                <img
                  src={img.image_url}
                  alt={img.alt_text || img.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => copyUrl(img.image_url)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteId(img.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate">{img.name}</p>
                {img.section_key && (
                  <p className="text-xs text-[var(--color-text-muted)]">Section: {img.section_key}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Image</DialogTitle>
            <DialogDescription>Upload an image to ImgBB and add it to your gallery.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Image File</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                {selectedFile ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setSelectedFile(null)}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer space-y-2 block">
                    <Upload className="h-8 w-8 mx-auto text-[var(--color-text-muted)]" />
                    <p className="text-sm text-[var(--color-text-muted)]">Click to select an image</p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          if (!uploadForm.name) {
                            setUploadForm((p) => ({ ...p, name: file.name.replace(/\.[^/.]+$/, "") }));
                          }
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={uploadForm.name}
                onChange={(e) => setUploadForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Image name"
              />
            </div>
            <div className="space-y-2">
              <Label>Alt Text</Label>
              <Input
                value={uploadForm.alt_text}
                onChange={(e) => setUploadForm((p) => ({ ...p, alt_text: e.target.value }))}
                placeholder="Describe the image"
              />
            </div>
            <div className="space-y-2">
              <Label>Section (optional)</Label>
              <select
                value={uploadForm.section_key}
                onChange={(e) => setUploadForm((p) => ({ ...p, section_key: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <option value="">None</option>
                <option value="hero">Hero</option>
                <option value="about">About</option>
                <option value="services">Services</option>
                <option value="testimonials">Testimonials</option>
                <option value="gallery">Gallery</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Image"
        description="Are you sure you want to delete this image? This action cannot be undone."
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
