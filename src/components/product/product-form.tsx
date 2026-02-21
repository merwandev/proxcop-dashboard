"use client";

import { useActionState } from "react";
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
import { Loader2 } from "lucide-react";
import { ImageUpload } from "./image-upload";

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

export function ProductForm({ product }: ProductFormProps) {
  const isEdit = !!product;

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
      {/* Image upload */}
      {isEdit && <ImageUpload productId={product.id} currentImage={product.imageUrl} />}

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
        />
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
