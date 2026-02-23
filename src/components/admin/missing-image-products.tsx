"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Upload via server-side proxy (avoids R2 CORS issues)
import { adminSetProductImage } from "@/lib/actions/product-actions";
import { Loader2, Upload, Check, Image as ImageIcon, Package, User } from "lucide-react";
import { toast } from "sonner";

interface ProductNoImage {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  createdAt: string;
  ownerUsername: string;
}

interface MissingImageProductsProps {
  products: ProductNoImage[];
}

export function MissingImageProducts({ products }: MissingImageProductsProps) {
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  const handleUpload = async (productId: string, file: File) => {
    setLoadingIds((prev) => new Set(prev).add(productId));

    try {
      const { default: imageCompression } = await import("browser-image-compression");
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 800,
        maxSizeMB: 0.2,
        useWebWorker: true,
      });

      const formData = new FormData();
      formData.append("file", compressed);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { publicUrl } = await uploadRes.json();

      await adminSetProductImage(productId, publicUrl);

      setResolvedIds((prev) => new Set(prev).add(productId));
      setImageUrls((prev) => ({ ...prev, [productId]: publicUrl }));
      toast.success("Image ajoutee");
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleUrlSubmit = async (productId: string, url: string) => {
    if (!url.startsWith("http")) {
      toast.error("URL invalide");
      return;
    }

    setLoadingIds((prev) => new Set(prev).add(productId));

    try {
      await adminSetProductImage(productId, url);

      setResolvedIds((prev) => new Set(prev).add(productId));
      setImageUrls((prev) => ({ ...prev, [productId]: url }));
      toast.success("Image ajoutee");
    } catch {
      toast.error("Erreur");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-3">
      {products.map((item) => {
        const isResolved = resolvedIds.has(item.id);
        const isLoading = loadingIds.has(item.id);
        const previewUrl = imageUrls[item.id];

        return (
          <div
            key={item.id}
            className={`rounded-xl p-4 space-y-3 ${
              isResolved ? "bg-success/10 border border-success/20" : "bg-secondary"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {previewUrl ? (
                  <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-white flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt={item.name}
                      className="w-full h-full object-contain p-0.5"
                    />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {item.sku && (
                      <span className="font-mono">{item.sku}</span>
                    )}
                    <span className="flex items-center gap-0.5">
                      <User className="h-3 w-3" />
                      {item.ownerUsername}
                    </span>
                  </div>
                </div>
              </div>
              {isResolved && (
                <div className="flex items-center gap-1 text-success flex-shrink-0">
                  <Check className="h-4 w-4" />
                  <span className="text-xs font-medium">Resolu</span>
                </div>
              )}
            </div>

            {!isResolved && (
              <div className="flex gap-2">
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
                      if (file) handleUpload(item.id, file);
                    }}
                    disabled={isLoading}
                  />
                </label>

                <form
                  className="flex gap-1.5 flex-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const input = form.elements.namedItem("url") as HTMLInputElement;
                    handleUrlSubmit(item.id, input.value);
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
