"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "./status-badge";
import { TimeBadge } from "./time-badge";
import { SaleDialog } from "@/components/sales/sale-dialog";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { CATEGORIES, STATUSES, STORAGE_LOCATIONS } from "@/lib/utils/constants";
import {
  updateProduct,
  updateVariant,
  deleteVariant,
  addVariantToProduct,
} from "@/lib/actions/product-actions";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  MapPin,
  Calendar,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

interface ProductVariant {
  id: string;
  productId: string;
  userId: string;
  sizeVariant: string | null;
  purchasePrice: string;
  purchaseDate: string;
  targetPrice: string | null;
  status: string;
  storageLocation: string | null;
  returnDeadline: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductDetailClientProps {
  product: {
    id: string;
    name: string;
    sku: string | null;
    category: string;
    imageUrl: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    variants: ProductVariant[];
  };
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [showSold, setShowSold] = useState(false);

  const inStockVariants = product.variants.filter((v) => v.status !== "vendu");
  const soldVariants = product.variants.filter((v) => v.status === "vendu");
  const categoryLabel = CATEGORIES.find((c) => c.value === product.category)?.label ?? product.category;

  return (
    <div className="space-y-4">
      {/* Product header card */}
      <Card className="p-4 bg-card border-border">
        <div className="flex gap-4">
          {/* Image */}
          <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-base truncate">{product.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {categoryLabel}
              </Badge>
              {product.sku && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  {product.sku}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {inStockVariants.length} en stock
              {soldVariants.length > 0 && (
                <span> &middot; {soldVariants.length} vendu{soldVariants.length > 1 ? "s" : ""}</span>
              )}
            </p>
            {product.notes && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.notes}</p>
            )}
          </div>
        </div>

        {/* Edit product info */}
        <div className="mt-3 flex gap-2">
          <EditProductDialog product={product} />
          <AddVariantDialog productId={product.id} />
        </div>
      </Card>

      {/* In-stock variants */}
      {inStockVariants.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground px-1">
            En stock ({inStockVariants.length})
          </h3>
          {inStockVariants.map((variant) => (
            <VariantCard key={variant.id} variant={variant} />
          ))}
        </div>
      )}

      {/* Sold variants */}
      {soldVariants.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowSold(!showSold)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground px-1"
          >
            Vendus ({soldVariants.length})
            {showSold ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          {showSold &&
            soldVariants.map((variant) => (
              <VariantCard key={variant.id} variant={variant} soldView />
            ))}
        </div>
      )}
    </div>
  );
}

// --- Variant Card ---

function VariantCard({
  variant,
  soldView = false,
}: {
  variant: ProductVariant;
  soldView?: boolean;
}) {
  return (
    <Card className={`p-3 bg-card border-border ${soldView ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {variant.sizeVariant && (
              <span className="font-medium text-sm">{variant.sizeVariant}</span>
            )}
            <StatusBadge status={variant.status} />
            {variant.status !== "vendu" && (
              <TimeBadge purchaseDate={variant.purchaseDate} />
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span>{formatCurrency(Number(variant.purchasePrice))}</span>
            {variant.targetPrice && (
              <span className="flex items-center gap-0.5">
                <Target className="h-3 w-3" />
                {formatCurrency(Number(variant.targetPrice))}
              </span>
            )}
            {variant.storageLocation && (
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                {STORAGE_LOCATIONS.find((s) => s.value === variant.storageLocation)?.label ?? variant.storageLocation}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {formatDate(variant.purchaseDate)}
            </span>
            {variant.returnDeadline && (
              <span className="text-warning">
                Retour: {formatDate(variant.returnDeadline)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {!soldView && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <EditVariantDialog variant={variant} />
            {variant.status !== "vendu" && (
              <SaleDialog variantId={variant.id} />
            )}
            <DeleteVariantButton variantId={variant.id} />
          </div>
        )}
      </div>
    </Card>
  );
}

// --- Edit Product Dialog ---

function EditProductDialog({
  product,
}: {
  product: ProductDetailClientProps["product"];
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(e.currentTarget);
      await updateProduct(product.id, {
        name: form.get("name") as string,
        sku: (form.get("sku") as string) || undefined,
        category: form.get("category") as "sneakers" | "pokemon" | "lego" | "random",
        notes: (form.get("notes") as string) || undefined,
      });
      toast.success("Produit modifie");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Erreur lors de la modification");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 flex-1">
          <Pencil className="h-3 w-3" />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le produit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Nom *</Label>
            <Input id="edit-name" name="name" defaultValue={product.name} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-sku">SKU</Label>
            <Input id="edit-sku" name="sku" defaultValue={product.sku ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label>Categorie</Label>
            <Select name="category" defaultValue={product.category}>
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
            <Label htmlFor="edit-notes">Notes</Label>
            <Input id="edit-notes" name="notes" defaultValue={product.notes ?? ""} />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Add Variant Dialog ---

function AddVariantDialog({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(e.currentTarget);
      await addVariantToProduct(productId, {
        sizeVariant: (form.get("sizeVariant") as string) || undefined,
        purchasePrice: Number(form.get("purchasePrice")),
        purchaseDate: form.get("purchaseDate") as string,
        targetPrice: form.get("targetPrice") ? Number(form.get("targetPrice")) : undefined,
        quantity: Number(form.get("quantity") || 1),
        storageLocation: (form.get("storageLocation") as string) || undefined,
        returnDeadline: (form.get("returnDeadline") as string) || undefined,
      });
      toast.success("Variant ajoute");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 flex-1">
          <Plus className="h-3 w-3" />
          Ajouter taille
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un variant</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-size">Taille</Label>
              <Input id="add-size" name="sizeVariant" placeholder="42, US 10..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-qty">Quantite</Label>
              <Input id="add-qty" name="quantity" type="number" min="1" defaultValue="1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-price">Prix d&apos;achat *</Label>
              <Input id="add-price" name="purchasePrice" type="number" step="0.01" min="0" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-target">Prix cible</Label>
              <Input id="add-target" name="targetPrice" type="number" step="0.01" min="0" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-date">Date d&apos;achat *</Label>
            <Input
              id="add-date"
              name="purchaseDate"
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Lieu de stockage</Label>
              <Select name="storageLocation">
                <SelectTrigger>
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {STORAGE_LOCATIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-deadline">Date retour</Label>
              <Input id="add-deadline" name="returnDeadline" type="date" />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Edit Variant Dialog ---

function EditVariantDialog({ variant }: { variant: ProductVariant }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(e.currentTarget);
      await updateVariant(variant.id, {
        sizeVariant: (form.get("sizeVariant") as string) || undefined,
        purchasePrice: Number(form.get("purchasePrice")),
        purchaseDate: form.get("purchaseDate") as string,
        targetPrice: form.get("targetPrice") ? Number(form.get("targetPrice")) : undefined,
        status: form.get("status") as string,
        storageLocation: (form.get("storageLocation") as string) || undefined,
        returnDeadline: (form.get("returnDeadline") as string) || undefined,
      });
      toast.success("Variant modifie");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Erreur lors de la modification");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Modifier{variant.sizeVariant ? ` — ${variant.sizeVariant}` : ""}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="ev-size">Taille</Label>
              <Input id="ev-size" name="sizeVariant" defaultValue={variant.sizeVariant ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select name="status" defaultValue={variant.status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.filter((s) => s.value !== "vendu").map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="ev-price">Prix d&apos;achat *</Label>
              <Input
                id="ev-price"
                name="purchasePrice"
                type="number"
                step="0.01"
                min="0"
                defaultValue={variant.purchasePrice}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-target">Prix cible</Label>
              <Input
                id="ev-target"
                name="targetPrice"
                type="number"
                step="0.01"
                min="0"
                defaultValue={variant.targetPrice ?? ""}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-date">Date d&apos;achat *</Label>
            <Input
              id="ev-date"
              name="purchaseDate"
              type="date"
              defaultValue={variant.purchaseDate}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Lieu de stockage</Label>
              <Select name="storageLocation" defaultValue={variant.storageLocation ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {STORAGE_LOCATIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-deadline">Date retour</Label>
              <Input
                id="ev-deadline"
                name="returnDeadline"
                type="date"
                defaultValue={variant.returnDeadline ?? ""}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Delete Variant Button ---

function DeleteVariantButton({ variantId }: { variantId: string }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteVariant(variantId);
      toast.success("Variant supprime");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-danger">
          <Trash2 className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer ce variant ?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Cette action est irreversible. Si c&apos;est le dernier variant, le produit sera aussi supprime.
        </p>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Supprimer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
