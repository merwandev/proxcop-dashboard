"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Upload via server-side proxy (avoids R2 CORS issues)
import { Loader2, Upload, Check, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

interface SkuItem {
  id: string;
  sku: string;
  stockxProductId: string | null;
  createdAt: string;
}

interface MissingSkuListProps {
  skus: SkuItem[];
}

export function MissingSkuList({ skus }: MissingSkuListProps) {
  const [resolvedSkus, setResolvedSkus] = useState<Set<string>>(new Set());
  const [dismissedSkus, setDismissedSkus] = useState<Set<string>>(new Set());
  const [loadingSkus, setLoadingSkus] = useState<Set<string>>(new Set());
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  const handleUpload = async (sku: string, file: File) => {
    setLoadingSkus((prev) => new Set(prev).add(sku));

    try {
      // Compress
      const { default: imageCompression } = await import("browser-image-compression");
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 800,
        maxSizeMB: 0.2,
        useWebWorker: true,
      });

      // Upload via server-side proxy to avoid R2 CORS issues
      const formData = new FormData();
      formData.append("file", compressed);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { publicUrl } = await uploadRes.json();

      // Save as staff-provided image
      await fetch("/api/admin/sku-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, imageUrl: publicUrl }),
      });

      setResolvedSkus((prev) => new Set(prev).add(sku));
      setImageUrls((prev) => ({ ...prev, [sku]: publicUrl }));
      toast.success(`Image ajoutee pour ${sku}`);
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setLoadingSkus((prev) => {
        const next = new Set(prev);
        next.delete(sku);
        return next;
      });
    }
  };

  const handleUrlSubmit = async (sku: string, url: string) => {
    if (!url.startsWith("http")) {
      toast.error("URL invalide");
      return;
    }

    setLoadingSkus((prev) => new Set(prev).add(sku));

    try {
      await fetch("/api/admin/sku-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, imageUrl: url }),
      });

      setResolvedSkus((prev) => new Set(prev).add(sku));
      setImageUrls((prev) => ({ ...prev, [sku]: url }));
      toast.success(`Image ajoutee pour ${sku}`);
    } catch {
      toast.error("Erreur");
    } finally {
      setLoadingSkus((prev) => {
        const next = new Set(prev);
        next.delete(sku);
        return next;
      });
    }
  };

  const visibleSkus = skus.filter((s) => !dismissedSkus.has(s.sku));

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {visibleSkus.length} SKU{visibleSkus.length > 1 ? "s" : ""} en attente
        {dismissedSkus.size > 0 && (
          <span className="text-muted-foreground/60"> ({dismissedSkus.size} masque{dismissedSkus.size > 1 ? "s" : ""})</span>
        )}
      </p>
      {visibleSkus.map((item) => {
        const isResolved = resolvedSkus.has(item.sku);
        const isLoading = loadingSkus.has(item.sku);
        const previewUrl = imageUrls[item.sku];

        return (
          <div
            key={item.id}
            className={`rounded-xl p-4 space-y-3 ${
              isResolved ? "bg-success/10 border border-success/20" : "bg-secondary"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-sm font-medium">{item.sku}</p>
                <p className="text-xs text-muted-foreground">
                  Detecte le {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isResolved && (
                  <div className="flex items-center gap-1 text-success">
                    <Check className="h-4 w-4" />
                    <span className="text-xs font-medium">Resolu</span>
                  </div>
                )}
                {!isResolved && (
                  <button
                    onClick={() => {
                      setDismissedSkus((prev) => new Set(prev).add(item.sku));
                      toast.info(`${item.sku} masque`);
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    title="Masquer ce SKU"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Preview if resolved */}
            {previewUrl && (
              <div className="rounded-lg overflow-hidden bg-white/5 h-24">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={item.sku}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {!isResolved && (
              <div className="flex gap-2">
                {/* File upload */}
                <label className="cursor-pointer flex-shrink-0">
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    <span className="text-xs font-medium">Upload</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(item.sku, file);
                    }}
                    disabled={isLoading}
                  />
                </label>

                {/* URL paste */}
                <form
                  className="flex gap-1.5 flex-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const input = form.elements.namedItem("url") as HTMLInputElement;
                    handleUrlSubmit(item.sku, input.value);
                  }}
                >
                  <Input
                    name="url"
                    placeholder="Coller une URL..."
                    className="h-9 text-xs"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="secondary"
                    className="h-9 px-2"
                    disabled={isLoading}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
