"use client";

import { useActionState, useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, PLATFORMS, STATUSES, STORAGE_LOCATIONS } from "@/lib/utils/constants";
import { createProduct, updateProduct } from "@/lib/actions/product-actions";
import { getPresignedUploadUrl } from "@/lib/actions/upload-actions";
import { Loader2, ImageIcon, X, Upload, AlertTriangle } from "lucide-react";
import { ImageUpload } from "./image-upload";
import { toast } from "sonner";

interface ProductFormProps {
  product?: {
    id: string;
    name: string;
    sku: string | null;
    category: string;
    sizeVariant: string | null;
    imageUrl: string | null;
    purchasePrice: string;
    purchaseDate: string;
    targetPrice: string | null;
    shippingFee: string | null;
    platformFee: string | null;
    platform: string | null;
    status: string;
    storageLocation: string | null;
    returnDeadline: string | null;
    notes: string | null;
  };
}

type SkuLookupStatus = "idle" | "loading" | "found" | "not_found" | "user_image" | "error";

export function ProductForm({ product }: ProductFormProps) {
  const isEdit = !!product;

  // SKU image lookup state
  const [skuImageUrl, setSkuImageUrl] = useState<string | null>(
    product?.imageUrl ?? null
  );
  const [skuLookupStatus, setSkuLookupStatus] = useState<SkuLookupStatus>(
    product?.imageUrl ? "found" : "idle"
  );
  const [uploading, setUploading] = useState(false);
  const skuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSkuRef = useRef<string>("");

  const handleSkuChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const sku = e.target.value.trim();
      currentSkuRef.current = sku;

      if (skuTimeoutRef.current) clearTimeout(skuTimeoutRef.current);

      if (sku.length < 3) {
        if (!isEdit) {
          setSkuImageUrl(null);
          setSkuLookupStatus("idle");
        }
        return;
      }

      skuTimeoutRef.current = setTimeout(async () => {
        setSkuLookupStatus("loading");
        try {
          const res = await fetch(
            `/api/sku-lookup?sku=${encodeURIComponent(sku)}`
          );
          const data = await res.json();

          if (data.status === "found") {
            setSkuImageUrl(data.imageUrl);
            setSkuLookupStatus("found");
          } else if (data.status === "not_found_global" && data.imageUrl) {
            setSkuImageUrl(data.imageUrl);
            setSkuLookupStatus("user_image");
          } else if (data.status === "not_found") {
            setSkuImageUrl(null);
            setSkuLookupStatus("not_found");
          } else {
            setSkuImageUrl(null);
            setSkuLookupStatus("error");
          }
        } catch {
          setSkuImageUrl(null);
          setSkuLookupStatus("error");
        }
      }, 800);
    },
    [isEdit]
  );

  // Handle user uploading a private fallback image
  const handleFallbackUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const sku = currentSkuRef.current;
      if (!sku || sku.length < 3) return;

      setUploading(true);
      try {
        // Compress image
        const { default: imageCompression } = await import("browser-image-compression");
        const compressed = await imageCompression(file, {
          maxWidthOrHeight: 800,
          maxSizeMB: 0.2,
          useWebWorker: true,
        });

        // Get presigned URL & upload to R2
        const { uploadUrl, publicUrl } = await getPresignedUploadUrl(compressed.type);
        await fetch(uploadUrl, {
          method: "PUT",
          body: compressed,
          headers: { "Content-Type": compressed.type },
        });

        // Save user's private SKU image
        await fetch("/api/sku-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sku, imageUrl: publicUrl }),
        });

        setSkuImageUrl(publicUrl);
        setSkuLookupStatus("user_image");
        toast.success("Image ajoutee");
      } catch {
        toast.error("Erreur lors de l'upload");
      } finally {
        setUploading(false);
      }
    },
    []
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (skuTimeoutRef.current) clearTimeout(skuTimeoutRef.current);
    };
  }, []);

  const action = async (_prev: unknown, formData: FormData) => {
    try {
      if (isEdit) {
        await updateProduct(product.id, formData);
      } else {
        await createProduct(formData);
      }
      return { success: true };
    } catch (e) {
      return { error: (e as Error).message };
    }
  };

  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {/* Hidden imageUrl from SKU lookup */}
      {skuImageUrl && (
        <input type="hidden" name="imageUrl" value={skuImageUrl} />
      )}

      {/* Image upload (edit mode) or SKU preview (create mode) */}
      {isEdit ? (
        <ImageUpload
          productId={product.id}
          currentImage={product.imageUrl ?? skuImageUrl}
        />
      ) : (
        <div>
          {/* Loading state */}
          {skuLookupStatus === "loading" && (
            <div className="rounded-xl overflow-hidden bg-secondary">
              <div className="flex items-center justify-center h-40 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Recherche image StockX...
                </span>
              </div>
            </div>
          )}

          {/* Found — auto image from StockX */}
          {skuLookupStatus === "found" && skuImageUrl && (
            <div className="relative rounded-xl overflow-hidden bg-secondary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={skuImageUrl}
                alt="SKU Preview"
                className="w-full h-40 object-contain bg-white/5"
              />
              <button
                type="button"
                onClick={() => {
                  setSkuImageUrl(null);
                  setSkuLookupStatus("idle");
                }}
                className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-background/80 rounded-md px-2 py-1">
                <ImageIcon className="h-3 w-3 text-success" />
                <span className="text-[10px] text-success font-medium">
                  Image auto via SKU
                </span>
              </div>
            </div>
          )}

          {/* User image — personal fallback */}
          {skuLookupStatus === "user_image" && skuImageUrl && (
            <div className="relative rounded-xl overflow-hidden bg-secondary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={skuImageUrl}
                alt="SKU Preview"
                className="w-full h-40 object-contain bg-white/5"
              />
              <button
                type="button"
                onClick={() => {
                  setSkuImageUrl(null);
                  setSkuLookupStatus("not_found");
                }}
                className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-background/80 rounded-md px-2 py-1">
                <ImageIcon className="h-3 w-3 text-warning" />
                <span className="text-[10px] text-warning font-medium">
                  Votre image personnelle
                </span>
              </div>
            </div>
          )}

          {/* Not found — prompt user to upload */}
          {skuLookupStatus === "not_found" && (
            <div className="rounded-xl bg-secondary p-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium">Image introuvable</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Un staff l&apos;ajoutera bientot. Vous pouvez ajouter votre propre image en attendant.
                  </p>
                </div>
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {uploading ? "Upload..." : "Ajouter votre image"}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFallbackUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Error state */}
          {skuLookupStatus === "error" && (
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-xs text-muted-foreground text-center">
                Service de recherche temporairement indisponible
              </p>
            </div>
          )}
        </div>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Nom du produit *</Label>
        <Input
          id="name"
          name="name"
          placeholder="Nike Dunk Low..."
          defaultValue={product?.name ?? ""}
          required
        />
      </div>

      {/* SKU */}
      <div className="space-y-1.5">
        <Label htmlFor="sku">SKU</Label>
        <Input
          id="sku"
          name="sku"
          placeholder="DD1391-100"
          defaultValue={product?.sku ?? ""}
          onChange={handleSkuChange}
        />
        <p className="text-[11px] text-muted-foreground">
          L&apos;image se remplit automatiquement via StockX
        </p>
      </div>

      {/* Category + Size */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Categorie *</Label>
          <Select name="category" defaultValue={product?.category ?? "sneakers"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sizeVariant">Taille / Variante</Label>
          <Input
            id="sizeVariant"
            name="sizeVariant"
            placeholder="42, XL..."
            defaultValue={product?.sizeVariant ?? ""}
          />
        </div>
      </div>

      {/* Purchase price + date */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="purchasePrice">Prix d&apos;achat * (EUR)</Label>
          <Input
            id="purchasePrice"
            name="purchasePrice"
            type="number"
            step="0.01"
            min="0"
            placeholder="120.00"
            defaultValue={product?.purchasePrice ?? ""}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="purchaseDate">Date d&apos;achat *</Label>
          <Input
            id="purchaseDate"
            name="purchaseDate"
            type="date"
            defaultValue={product?.purchaseDate ?? new Date().toISOString().split("T")[0]}
            required
          />
        </div>
      </div>

      {/* Target price */}
      <div className="space-y-1.5">
        <Label htmlFor="targetPrice">Prix cible (EUR)</Label>
        <Input
          id="targetPrice"
          name="targetPrice"
          type="number"
          step="0.01"
          min="0"
          placeholder="180.00"
          defaultValue={product?.targetPrice ?? ""}
        />
      </div>

      {/* Fees */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="shippingFee">Frais de port</Label>
          <Input
            id="shippingFee"
            name="shippingFee"
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
            defaultValue={product?.shippingFee ?? "0"}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="platformFee">Commission plateforme</Label>
          <Input
            id="platformFee"
            name="platformFee"
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
            defaultValue={product?.platformFee ?? "0"}
          />
        </div>
      </div>

      {/* Platform + Status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Plateforme</Label>
          <Select name="platform" defaultValue={product?.platform ?? undefined}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir..." />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Statut</Label>
          <Select name="status" defaultValue={product?.status ?? "en_stock"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Storage location */}
      <div className="space-y-1.5">
        <Label>Lieu de stockage</Label>
        <Select name="storageLocation" defaultValue={product?.storageLocation ?? undefined}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir..." />
          </SelectTrigger>
          <SelectContent>
            {STORAGE_LOCATIONS.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Return deadline */}
      <div className="space-y-1.5">
        <Label htmlFor="returnDeadline">Date limite de retour</Label>
        <Input
          id="returnDeadline"
          name="returnDeadline"
          type="date"
          defaultValue={product?.returnDeadline ?? ""}
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Notes supplementaires..."
          defaultValue={product?.notes ?? ""}
          rows={3}
        />
      </div>

      {/* Error */}
      {state && "error" in state && (
        <p className="text-sm text-danger">{state.error}</p>
      )}

      {/* Submit */}
      <Button type="submit" className="w-full h-12" disabled={isPending}>
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isEdit ? (
          "Modifier"
        ) : (
          "Ajouter le produit"
        )}
      </Button>
    </form>
  );
}
