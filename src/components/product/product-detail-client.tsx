"use client";

import Image from "next/image";
import { useState, useMemo, useEffect, useCallback } from "react";
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
import { SaleSuccessAnimation, type SaleSuccessData } from "@/components/sales/sale-success-animation";
import { CopyableSku } from "@/components/ui/copyable-sku";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { CATEGORIES, STATUSES, STORAGE_LOCATIONS, PLATFORMS } from "@/lib/utils/constants";
import {
  updateProduct,
  updateVariant,
  deleteVariant,
  addVariantToProduct,
  toggleVariantListing,
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
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Module-level variable: survives component remounts caused by RSC re-renders
let _pendingSaleData: SaleSuccessData | null = null;

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
  supplierName: string | null;
  listedOn: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MedianPrice {
  median: number;
  saleCount: number;
}

interface Supplier {
  id: string;
  name: string;
  returnDays: string | null;
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
  medianPrices?: Record<string, MedianPrice>;
  suppliers?: Supplier[];
  platformFees?: Record<string, number>;
  userName?: string;
  showSuccessAnimation?: boolean;
}

export function ProductDetailClient({ product, medianPrices, suppliers = [], platformFees, userName, showSuccessAnimation }: ProductDetailClientProps) {
  const [showSold, setShowSold] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [saleSuccessData, setSaleSuccessData] = useState<SaleSuccessData | null>(
    () => _pendingSaleData // Restore from module-level on mount/remount
  );

  // If state was reset by an RSC re-render but module-level still has data, restore it
  useEffect(() => {
    if (_pendingSaleData && !saleSuccessData) {
      setSaleSuccessData(_pendingSaleData);
    }
  });

  const handleSaleSuccess = useCallback((data: SaleSuccessData) => {
    _pendingSaleData = data;
    setSaleSuccessData(data);
  }, []);

  const handleAnimationClose = useCallback(() => {
    _pendingSaleData = null;
    setSaleSuccessData(null);
  }, []);

  const allInStockVariants = product.variants.filter((v) => v.status !== "vendu");
  const soldVariants = product.variants.filter((v) => v.status === "vendu");
  const categoryLabel = CATEGORIES.find((c) => c.value === product.category)?.label ?? product.category;

  // Get statuses present in in-stock variants
  const usedStatuses = useMemo(() => {
    const statusSet = new Set<string>();
    allInStockVariants.forEach((v) => { if (v.status) statusSet.add(v.status); });
    return STATUSES.filter((s) => statusSet.has(s.value) && s.value !== "vendu");
  }, [allInStockVariants]);

  // Get platforms present in in-stock variants
  const usedPlatforms = useMemo(() => {
    const platformSet = new Set<string>();
    allInStockVariants.forEach((v) => {
      if (v.listedOn) v.listedOn.forEach((p) => platformSet.add(p));
    });
    return PLATFORMS.filter((p) => platformSet.has(p.value));
  }, [allInStockVariants]);

  // Filter in-stock variants
  const inStockVariants = useMemo(() => {
    let result = allInStockVariants;
    if (selectedStatus) {
      result = result.filter((v) => v.status === selectedStatus);
    }
    if (selectedPlatform) {
      result = result.filter((v) => v.listedOn?.includes(selectedPlatform));
    }
    return result;
  }, [allInStockVariants, selectedStatus, selectedPlatform]);

  const hasFilters = selectedStatus || selectedPlatform;

  return (
    <div className="space-y-4">
      {/* Product header card */}
      <Card className="p-4 bg-card border-border">
        <div className="flex gap-4">
          {/* Image */}
          <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-white flex-shrink-0">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-contain p-1"
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
            <h2 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2">{product.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {categoryLabel}
              </Badge>
              {product.sku && (
                <CopyableSku sku={product.sku} className="text-[10px]" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {allInStockVariants.length} en stock
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

      {/* Variant filters */}
      {allInStockVariants.length > 0 && (usedStatuses.length > 0 || usedPlatforms.length > 0) && (
        <div className="space-y-2">
          {/* Status filter chips */}
          {usedStatuses.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedStatus(null)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-colors",
                  !selectedStatus
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-card border-border text-muted-foreground hover:border-border-hover"
                )}
              >
                Tous
              </button>
              {usedStatuses.map((s) => (
                <button
                  key={s.value}
                  onClick={() =>
                    setSelectedStatus(selectedStatus === s.value ? null : s.value)
                  }
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1",
                    selectedStatus === s.value
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-card border-border text-muted-foreground hover:border-border-hover"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", s.color)} />
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Platform filter chips */}
          {usedPlatforms.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {usedPlatforms.map((p) => (
                <button
                  key={p.value}
                  onClick={() =>
                    setSelectedPlatform(selectedPlatform === p.value ? null : p.value)
                  }
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-colors",
                    selectedPlatform === p.value
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "bg-card border-border text-muted-foreground hover:border-border-hover"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* In-stock variants */}
      {inStockVariants.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground px-1">
            En stock ({inStockVariants.length}{hasFilters ? ` / ${allInStockVariants.length}` : ""})
          </h3>
          {inStockVariants.map((variant) => {
            const sizeKey = variant.sizeVariant?.toUpperCase() ?? "";
            return (
              <VariantCard
                key={variant.id}
                variant={variant}
                medianPrice={medianPrices?.[sizeKey] ?? null}
                suppliers={suppliers}
                platformFees={platformFees}
                productInfo={{ name: product.name, imageUrl: product.imageUrl, sku: product.sku }}
                userName={userName}
                showSuccessAnimation={showSuccessAnimation}
                onSaleSuccess={handleSaleSuccess}
              />
            );
          })}
        </div>
      )}

      {/* No results when filtering */}
      {inStockVariants.length === 0 && hasFilters && (
        <p className="text-center py-8 text-sm text-muted-foreground">
          Aucun variant avec ces filtres
        </p>
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
            soldVariants.map((variant) => {
              const sizeKey = variant.sizeVariant?.toUpperCase() ?? "";
              return (
                <VariantCard
                  key={variant.id}
                  variant={variant}
                  soldView
                  medianPrice={medianPrices?.[sizeKey] ?? null}
                  suppliers={suppliers}
                />
              );
            })}
        </div>
      )}
      {/* Sale success animation overlay — rendered at parent level to survive variant re-renders */}
      {saleSuccessData && (
        <SaleSuccessAnimation
          data={saleSuccessData}
          onClose={handleAnimationClose}
        />
      )}
    </div>
  );
}

// --- Variant Card ---

function getReturnDeadlineStatus(deadline: string | null) {
  if (!deadline) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: `Retour dépassé (${Math.abs(daysLeft)}j)`, daysLeft, color: "muted-foreground" as const };
  if (daysLeft <= 3) return { label: `Retour dans ${daysLeft}j`, daysLeft, color: "danger" as const };
  if (daysLeft <= 7) return { label: `Retour dans ${daysLeft}j`, daysLeft, color: "warning" as const };
  return { label: `Retour dans ${daysLeft}j`, daysLeft, color: "success" as const };
}

function VariantCard({
  variant,
  soldView = false,
  medianPrice = null,
  suppliers = [],
  platformFees,
  productInfo,
  userName,
  showSuccessAnimation,
  onSaleSuccess,
}: {
  variant: ProductVariant;
  soldView?: boolean;
  medianPrice?: MedianPrice | null;
  suppliers?: Supplier[];
  platformFees?: Record<string, number>;
  productInfo?: { name: string; imageUrl: string | null; sku: string | null };
  userName?: string;
  showSuccessAnimation?: boolean;
  onSaleSuccess?: (data: SaleSuccessData) => void;
}) {
  const returnStatus = !soldView ? getReturnDeadlineStatus(variant.returnDeadline) : null;

  return (
    <Card className={`p-3 bg-card border-border ${soldView ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
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
            {medianPrice && (
              <span className="flex items-center gap-0.5 text-blue-400">
                <TrendingUp className="h-3 w-3" />
                {formatCurrency(medianPrice.median)}
                <span className="text-[9px] text-muted-foreground">
                  ({medianPrice.saleCount})
                </span>
              </span>
            )}
            {variant.storageLocation && (
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                {STORAGE_LOCATIONS.find((s) => s.value === variant.storageLocation)?.label ?? variant.storageLocation}
              </span>
            )}
            {variant.supplierName && (
              <span className="text-muted-foreground">{variant.supplierName}</span>
            )}
          </div>
          {/* Listed platforms */}
          {variant.status !== "vendu" && variant.listedOn && variant.listedOn.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {variant.listedOn.map((p) => (
                <Badge key={p} variant="secondary" className="text-[9px] h-4 px-1.5 bg-primary/10 text-primary">
                  {PLATFORMS.find((pl) => pl.value === p)?.label ?? p}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {formatDate(variant.purchaseDate)}
            </span>
            {returnStatus && (
              <span className={`flex items-center gap-0.5 ${
                returnStatus.color === "danger"
                  ? "text-danger"
                  : returnStatus.color === "warning"
                    ? "text-warning"
                    : returnStatus.color === "success"
                      ? "text-success"
                      : "text-muted-foreground"
              }`}>
                <Calendar className="h-2.5 w-2.5" />
                {formatDate(variant.returnDeadline!)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {!soldView && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <EditVariantDialog variant={variant} medianPrice={medianPrice} suppliers={suppliers} />
            {variant.status !== "vendu" && (
              <SaleDialog
                variantId={variant.id}
                productInfo={productInfo ? {
                  ...productInfo,
                  sizeVariant: variant.sizeVariant,
                  purchasePrice: Number(variant.purchasePrice),
                } : undefined}
                platformFees={platformFees}
                userName={userName}
                showSuccessAnimation={showSuccessAnimation}
                onSaleSuccess={onSaleSuccess}
              />
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

function EditVariantDialog({ variant, medianPrice = null, suppliers = [] }: { variant: ProductVariant; medianPrice?: MedianPrice | null; suppliers?: Supplier[] }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [listedOn, setListedOn] = useState<string[]>(variant.listedOn ?? []);
  const [togglingPlatform, setTogglingPlatform] = useState<string | null>(null);
  const router = useRouter();

  const toggleListed = async (platform: string) => {
    setTogglingPlatform(platform);
    try {
      await toggleVariantListing(variant.id, platform);
      setListedOn((prev) =>
        prev.includes(platform)
          ? prev.filter((p) => p !== platform)
          : [...prev, platform]
      );
      router.refresh();
    } catch {
      toast.error("Erreur");
    } finally {
      setTogglingPlatform(null);
    }
  };

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
        supplierName: ((form.get("supplierName") as string) === "__none__" ? undefined : (form.get("supplierName") as string)) || undefined,
        listedOn,
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

  // Platforms available for listing (exclude discord and other)
  const listingPlatforms = PLATFORMS.filter(
    (p) => p.value !== "discord" && p.value !== "other"
  );

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
              {medianPrice && (
                <p className="text-[10px] text-blue-400 flex items-center gap-0.5">
                  <TrendingUp className="h-2.5 w-2.5" />
                  Median: {formatCurrency(medianPrice.median)} ({medianPrice.saleCount} ventes)
                </p>
              )}
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
          {/* Supplier */}
          <div className="space-y-1.5">
            <Label>Fournisseur</Label>
            <Select name="supplierName" defaultValue={variant.supplierName ?? ""}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Aucun</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.name}>
                    {s.name}{s.returnDays ? ` (${s.returnDays}j)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Listed on platforms */}
          <div className="space-y-1.5">
            <Label>Marque comme publie sur</Label>
            <div className="flex flex-wrap gap-1.5">
              {listingPlatforms.map((p) => {
                const isActive = listedOn.includes(p.value);
                return (
                  <button
                    key={p.value}
                    type="button"
                    disabled={togglingPlatform === p.value}
                    onClick={() => toggleListed(p.value)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      isActive
                        ? "bg-primary/20 text-primary border-primary/40"
                        : "bg-card border-border text-muted-foreground hover:border-border"
                    }`}
                  >
                    {togglingPlatform === p.value ? "..." : p.label}
                  </button>
                );
              })}
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
