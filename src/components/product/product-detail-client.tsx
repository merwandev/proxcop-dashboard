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
import { CashbackIndicator, CashbackSection } from "./cashback-dialog";
import { CopyableSku } from "@/components/ui/copyable-sku";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { CATEGORIES, STATUSES, STORAGE_LOCATIONS, PLATFORMS } from "@/lib/utils/constants";
import { createBulkSales } from "@/lib/actions/sale-actions";
import {
  updateProduct,
  updateVariant,
  deleteVariant,
  addVariantToProduct,
  toggleVariantListing,
  duplicateProduct,
  bulkUpdateReturnDeadline,
} from "@/lib/actions/product-actions";
import { EditImageDialog } from "./edit-image-dialog";
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
  Copy,
  ShoppingBag,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Module-level variable: survives component remounts caused by RSC re-renders
let _pendingSaleData: SaleSuccessData | null = null;

interface CashbackItem {
  id: string;
  amount: string;
  source: string;
  status: string;
  requestedAt: Date;
  receivedAt: Date | null;
}

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
  cashbacks?: CashbackItem[];
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
  const totalVariants = product.variants.length;
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
          <EditImageDialog
            productId={product.id}
            productName={product.name}
            trigger={
              <button type="button" className="relative h-20 w-20 rounded-lg overflow-hidden bg-white flex-shrink-0 group cursor-pointer">
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
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </button>
            }
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2">{product.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {categoryLabel}
              </Badge>
              <CopyableSku sku={product.sku} fallback={product.name} className="text-[10px]" />
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
        <div className="mt-3 flex gap-2 flex-wrap">
          <EditProductDialog product={product} />
          <AddVariantDialog productId={product.id} />
          <DuplicateProductButton productId={product.id} />
          <BulkReturnDeadlineDialog productId={product.id} variantCount={allInStockVariants.length} />
          <BulkSaleDialog variants={product.variants} onSaleSuccess={handleSaleSuccess} />
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
                isLastVariant={totalVariants === 1}
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
  isLastVariant,
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
  isLastVariant?: boolean;
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
            {variant.cashbacks && variant.cashbacks.length > 0 && (
              <CashbackIndicator cashbacks={variant.cashbacks} />
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
          {/* Cashback management */}
          {!soldView && (
            <CashbackSection variantId={variant.id} purchasePrice={Number(variant.purchasePrice)} cashbacks={variant.cashbacks ?? []} />
          )}
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
            <DeleteVariantButton variantId={variant.id} isLastVariant={isLastVariant} />
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
      toast.success("Produit modifié");
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
      toast.success("Variant ajouté");
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
      toast.success("Variant modifié");
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

// --- Bulk Sale Dialog ---

function BulkSaleDialog({ variants, onSaleSuccess }: { variants: ProductVariant[]; onSaleSuccess?: (data: SaleSuccessData) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [platform, setPlatform] = useState("");
  const [anonymousSale, setAnonymousSale] = useState(false);
  const router = useRouter();

  const unsoldVariants = variants.filter((v) => v.status !== "vendu");

  const toggleVariant = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === unsoldVariants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unsoldVariants.map((v) => v.id)));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedIds.size === 0) { toast.error("Sélectionnez au moins un variant"); return; }
    setSaving(true);
    try {
      const form = new FormData(e.currentTarget);
      const salePrice = Number(form.get("salePrice"));
      const saleDate = form.get("saleDate") as string;
      await createBulkSales({
        variantIds: Array.from(selectedIds),
        salePrice,
        saleDate,
        platform: platform || undefined,
        platformFee: Number(form.get("platformFee") || 0),
        shippingCost: Number(form.get("shippingCost") || 0),
        otherFees: Number(form.get("otherFees") || 0),
        buyerUsername: (form.get("buyerUsername") as string) || undefined,
        paymentStatus: (form.get("paymentStatus") as string) || undefined,
        notes: (form.get("notes") as string) || undefined,
        anonymousSale,
      });
      toast.success(`${selectedIds.size} vente${selectedIds.size > 1 ? "s" : ""} créée${selectedIds.size > 1 ? "s" : ""}`);

      // Trigger success animation if available
      if (onSaleSuccess) {
        const firstVariant = unsoldVariants.find((v) => selectedIds.has(v.id));
        onSaleSuccess({
          salePrice,
          purchasePrice: firstVariant ? Number(firstVariant.purchasePrice) : 0,
          platformFee: Number(form.get("platformFee") || 0),
          shippingCost: Number(form.get("shippingCost") || 0),
          otherFees: Number(form.get("otherFees") || 0),
          platform: platform || null,
          saleDate,
          productName: `${selectedIds.size} items vendus`,
          productImage: null,
          productSku: null,
          sizeVariant: null,
        });
      }

      setOpen(false);
      setSelectedIds(new Set());
      setAnonymousSale(false);
      router.refresh();
    } catch {
      toast.error("Erreur lors de la création des ventes");
    } finally {
      setSaving(false);
    }
  };

  if (unsoldVariants.length < 2) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSelectedIds(new Set()); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ShoppingBag className="h-3.5 w-3.5 mr-1" />
          <span className="text-xs">Vendre en masse</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vente en masse</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Variant selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Variants à vendre ({selectedIds.size}/{unsoldVariants.length})</Label>
              <button type="button" onClick={selectAll} className="text-xs text-primary hover:underline">
                {selectedIds.size === unsoldVariants.length ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {unsoldVariants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => toggleVariant(v.id)}
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors",
                    selectedIds.has(v.id) ? "bg-primary/10 text-primary" : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  <div className={cn("h-4 w-4 rounded border flex items-center justify-center shrink-0", selectedIds.has(v.id) ? "bg-primary border-primary" : "border-muted-foreground/30")}>
                    {selectedIds.has(v.id) && <span className="text-[10px] text-primary-foreground">✓</span>}
                  </div>
                  <span>{v.sizeVariant || "Taille unique"}</span>
                  <span className="text-muted-foreground ml-auto">{formatCurrency(Number(v.purchasePrice))}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-salePrice">Prix de vente *</Label>
              <Input id="bulk-salePrice" name="salePrice" type="number" step="0.01" min="0" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-saleDate">Date de vente *</Label>
              <Input id="bulk-saleDate" name="saleDate" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Plateforme</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Commission</Label>
              <Input name="platformFee" type="number" step="0.01" min="0" defaultValue="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Frais envoi</Label>
              <Input name="shippingCost" type="number" step="0.01" min="0" defaultValue="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Autres frais</Label>
              <Input name="otherFees" type="number" step="0.01" min="0" defaultValue="0" />
            </div>
          </div>

          {/* Discord-specific fields */}
          {platform === "discord" && (
            <div className="space-y-3 rounded-lg border border-[#5865F2]/30 bg-[#5865F2]/5 p-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Acheteur Discord</Label>
                <Input name="buyerUsername" placeholder="@username" className="bg-card" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Statut du paiement</Label>
                <Select name="paymentStatus" defaultValue="paid">
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Déjà payé</SelectItem>
                    <SelectItem value="pending">Paiement à réception</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Input name="notes" placeholder="Notes optionnelles..." />
          </div>

          {/* Anonymous sale toggle */}
          <button
            type="button"
            onClick={() => setAnonymousSale(!anonymousSale)}
            className={`flex items-center gap-2 w-full rounded-lg border p-2.5 text-sm transition-colors ${
              anonymousSale
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-border bg-secondary/50 text-muted-foreground"
            }`}
          >
            <div className="text-left flex-1">
              <p className="font-medium text-xs">Vente anonyme</p>
            </div>
            <div className={`h-5 w-9 rounded-full transition-colors ${anonymousSale ? "bg-primary" : "bg-muted-foreground/30"}`}>
              <div className={`h-4 w-4 rounded-full bg-white mt-0.5 transition-transform ${anonymousSale ? "translate-x-4.5" : "translate-x-0.5"}`} />
            </div>
          </button>

          <Button type="submit" className="w-full" disabled={saving || selectedIds.size === 0}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Vendre ${selectedIds.size} variant${selectedIds.size > 1 ? "s" : ""}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Bulk Return Deadline Dialog ---

function BulkReturnDeadlineDialog({ productId, variantCount }: { productId: string; variantCount: number }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(e.currentTarget);
      const deadline = form.get("returnDeadline") as string;
      await bulkUpdateReturnDeadline(productId, deadline || null);
      toast.success(`Date de retour mise à jour pour ${variantCount} variant${variantCount > 1 ? "s" : ""}`);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Calendar className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Date de retour en masse</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Appliquer à tous les variants non vendus ({variantCount})
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Date de retour</Label>
            <Input type="date" name="returnDeadline" />
            <p className="text-xs text-muted-foreground">Laisser vide pour supprimer la date de retour</p>
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Appliquer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Duplicate Product Button ---

function DuplicateProductButton({ productId }: { productId: string }) {
  const [duplicating, setDuplicating] = useState(false);
  const router = useRouter();

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const newId = await duplicateProduct(productId);
      toast.success("Produit dupliqué");
      router.push(`/stock/${newId}`);
    } catch {
      toast.error("Erreur lors de la duplication");
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={duplicating}>
      {duplicating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

// --- Delete Variant Button ---

function DeleteVariantButton({ variantId, isLastVariant }: { variantId: string; isLastVariant?: boolean }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { productDeleted } = await deleteVariant(variantId);
      toast.success("Variant supprimé");
      setOpen(false);
      if (productDeleted) {
        router.push("/stock");
      } else {
        router.refresh();
      }
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
          Cette action est irréversible. Si c&apos;est le dernier variant, le produit sera aussi supprimé.
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
