"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { CopyableSku } from "@/components/ui/copyable-sku";
import { PLATFORMS } from "@/lib/utils/constants";
import { updateSale, deleteSale, markDealAsPaid, deleteBulkSales, duplicateBulkSales } from "@/lib/actions/sale-actions";
import { PAYMENT_METHODS } from "@/lib/utils/constants";
import { Search, Package, X, Loader2, Trash2, Clock, CheckSquare, Square, Copy, Trash } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SaleExport } from "./sale-export";

interface SaleItem {
  sale: {
    id: string;
    salePrice: string;
    saleDate: string;
    platform: string | null;
    platformFee: string | null;
    shippingCost: string | null;
    otherFees: string | null;
    buyerUsername: string | null;
    paymentStatus: string | null;
    paymentMethod: string | null;
  };
  variant: {
    purchasePrice: string;
    sizeVariant: string | null;
  };
  product: {
    name: string;
    imageUrl: string | null;
    sku: string | null;
  };
}

interface VentesClientProps {
  salesData: SaleItem[];
  userName?: string;
}

export function VentesClient({ salesData, userName }: VentesClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [editingSale, setEditingSale] = useState<SaleItem | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Get unique platforms from actual sales data
  const usedPlatforms = useMemo(() => {
    const platforms = new Set<string>();
    salesData.forEach((s) => {
      if (s.sale.platform) platforms.add(s.sale.platform);
    });
    return PLATFORMS.filter((p) => platforms.has(p.value));
  }, [salesData]);

  // Search-filtered sales
  const searchFiltered = useMemo(() => {
    if (!search) return salesData;
    const q = search.toLowerCase();
    return salesData.filter((s) => {
      const matchName = s.product.name.toLowerCase().includes(q);
      const matchSku = s.product.sku?.toLowerCase().includes(q);
      const matchSize = s.variant.sizeVariant?.toLowerCase().includes(q);
      return matchName || matchSku || matchSize;
    });
  }, [salesData, search]);

  // Intermediate: search + platform (for computing available sizes)
  const platformFiltered = useMemo(() => {
    if (!selectedPlatform) return searchFiltered;
    return searchFiltered.filter((s) => s.sale.platform === selectedPlatform);
  }, [searchFiltered, selectedPlatform]);

  // Get unique sizes from search+platform filtered data (cascading filters)
  const usedSizes = useMemo(() => {
    const sizes = new Set<string>();
    platformFiltered.forEach((s) => {
      if (s.variant.sizeVariant) sizes.add(s.variant.sizeVariant);
    });
    return Array.from(sizes).sort((a, b) => {
      const na = parseFloat(a);
      const nb = parseFloat(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [platformFiltered]);

  // Full filter (search + platform + size)
  const filtered = useMemo(() => {
    return platformFiltered.filter((s) => {
      if (selectedSize && s.variant.sizeVariant !== selectedSize) return false;
      return true;
    });
  }, [platformFiltered, selectedSize]);

  const handleFilterChange = (
    setter: React.Dispatch<React.SetStateAction<string | null>>,
    value: string | null
  ) => {
    setter(value);
    if (setter === setSelectedPlatform) setSelectedSize(null);
    setPage(1);
  };

  // Compute totals on filtered
  const totalRevenue = filtered.reduce(
    (sum, s) => sum + Number(s.sale.salePrice),
    0
  );
  const totalProfit = filtered.reduce((sum, s) => {
    const profit =
      Number(s.sale.salePrice) -
      Number(s.variant.purchasePrice) -
      Number(s.sale.platformFee ?? 0) -
      Number(s.sale.shippingCost ?? 0) -
      Number(s.sale.otherFees ?? 0);
    return sum + profit;
  }, 0);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.sale.id)));
    }
  }, [filtered, selectedIds.size]);

  const handleBulkDelete = async () => {
    setBulkLoading(true);
    try {
      await deleteBulkSales(Array.from(selectedIds));
      toast.success(`${selectedIds.size} vente${selectedIds.size > 1 ? "s" : ""} supprimée${selectedIds.size > 1 ? "s" : ""}`);
      setSelectedIds(new Set());
      setSelectionMode(false);
      setConfirmBulkDelete(false);
      router.refresh();
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDuplicate = async () => {
    setBulkLoading(true);
    try {
      await duplicateBulkSales(Array.from(selectedIds));
      toast.success(`${selectedIds.size} vente${selectedIds.size > 1 ? "s" : ""} dupliquée${selectedIds.size > 1 ? "s" : ""}`);
      setSelectedIds(new Set());
      setSelectionMode(false);
      router.refresh();
    } catch {
      toast.error("Erreur lors de la duplication");
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <>
      {/* Summary */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3 gap-0 bg-card border-border">
          <p className="text-[10px] text-muted-foreground uppercase">
            Total ventes
          </p>
          <p className="text-lg font-bold">{formatCurrency(totalRevenue)}</p>
        </Card>
        <Card className="p-3 gap-0 bg-card border-border">
          <p className="text-[10px] text-muted-foreground uppercase">
            Profit total
          </p>
          <p className={cn("text-lg font-bold", totalProfit >= 0 ? "text-success" : "text-danger")}>
            {formatCurrency(totalProfit)}
          </p>
        </Card>
      </div>

      {/* Search + Select toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 bg-card border-border h-9 text-sm"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {salesData.length > 0 && (
          <Button
            variant={selectionMode ? "default" : "outline"}
            size="sm"
            className="h-9 gap-1.5 shrink-0"
            onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()); setConfirmBulkDelete(false); }}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {selectionMode ? "Annuler" : "Sélectionner"}
          </Button>
        )}
      </div>

      {/* Platform filters */}
      {usedPlatforms.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => handleFilterChange(setSelectedPlatform, null)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              !selectedPlatform
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-card border-border text-muted-foreground hover:border-border-hover"
            )}
          >
            Toutes
          </button>
          {usedPlatforms.map((p) => (
            <button
              key={p.value}
              onClick={() =>
                handleFilterChange(
                  setSelectedPlatform,
                  selectedPlatform === p.value ? null : p.value
                )
              }
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                selectedPlatform === p.value
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-card border-border text-muted-foreground hover:border-border-hover"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Size filters */}
      {usedSizes.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => handleFilterChange(setSelectedSize, null)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              !selectedSize
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-card border-border text-muted-foreground hover:border-border-hover"
            )}
          >
            Toutes tailles
          </button>
          {usedSizes.map((size) => (
            <button
              key={size}
              onClick={() =>
                handleFilterChange(
                  setSelectedSize,
                  selectedSize === size ? null : size
                )
              }
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                selectedSize === size
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-card border-border text-muted-foreground hover:border-border-hover"
              )}
            >
              {size}
            </button>
          ))}
        </div>
      )}

      {/* Results count */}
      {(search || selectedPlatform || selectedSize) && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} resultat{filtered.length !== 1 ? "s" : ""}
          {search && <span> pour &quot;{search}&quot;</span>}
          {selectedPlatform && (
            <span>
              {" "}
              sur{" "}
              {PLATFORMS.find((p) => p.value === selectedPlatform)?.label}
            </span>
          )}
        </p>
      )}

      {/* Select all in selection mode */}
      {selectionMode && filtered.length > 0 && (
        <div className="flex items-center gap-2">
          <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {selectedIds.size === filtered.length ? (
              <CheckSquare className="h-4 w-4 text-primary" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            Tout sélectionner ({filtered.length})
          </button>
        </div>
      )}

      {/* Sales list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center py-12 text-sm text-muted-foreground">
            {salesData.length === 0
              ? "Aucune vente enregistree"
              : "Aucun resultat"}
          </p>
        ) : (
          filtered.map((item) => (
            <div key={item.sale.id} className="flex items-start gap-2">
              {selectionMode && (
                <button
                  onClick={() => toggleSelection(item.sale.id)}
                  className="mt-3 shrink-0"
                >
                  {selectedIds.has(item.sale.id) ? (
                    <CheckSquare className="h-5 w-5 text-primary" />
                  ) : (
                    <Square className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              )}
              <div className="flex-1 min-w-0">
                <SaleCard
                  item={item}
                  onEdit={() => { if (!selectionMode) setEditingSale(item); else toggleSelection(item.sale.id); }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating action bar for selection mode */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-16 lg:bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-card border border-border rounded-full shadow-lg px-4 py-2">
          <span className="text-sm font-medium">{selectedIds.size} sélectionnée{selectedIds.size > 1 ? "s" : ""}</span>
          <div className="h-4 w-px bg-border" />
          {!confirmBulkDelete ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-primary"
                onClick={handleBulkDuplicate}
                disabled={bulkLoading}
              >
                <Copy className="h-3.5 w-3.5" />
                Dupliquer
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-danger"
                onClick={() => setConfirmBulkDelete(true)}
                disabled={bulkLoading}
              >
                <Trash className="h-3.5 w-3.5" />
                Supprimer
              </Button>
            </>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">Confirmer ?</span>
              <Button variant="outline" size="sm" className="h-7" onClick={() => setConfirmBulkDelete(false)} disabled={bulkLoading}>Non</Button>
              <Button variant="destructive" size="sm" className="h-7" onClick={handleBulkDelete} disabled={bulkLoading}>
                {bulkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Oui"}
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); setConfirmBulkDelete(false); }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Edit/Delete dialog */}
      {editingSale && (
        <EditSaleDialog
          item={editingSale}
          open={!!editingSale}
          onOpenChange={(open) => {
            if (!open) setEditingSale(null);
          }}
          userName={userName}
        />
      )}
    </>
  );
}

// --- Sale Card ---

function SaleCard({
  item,
  onEdit,
}: {
  item: SaleItem;
  onEdit: () => void;
}) {
  const { sale, variant, product } = item;
  const profit =
    Number(sale.salePrice) -
    Number(variant.purchasePrice) -
    Number(sale.platformFee ?? 0) -
    Number(sale.shippingCost ?? 0) -
    Number(sale.otherFees ?? 0);
  const margin =
    Number(sale.salePrice) > 0
      ? (profit / Number(sale.salePrice)) * 100
      : 0;
  const isPending = sale.paymentStatus === "pending";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEdit(); } }}
      className="w-full text-left"
    >
      <Card className={cn("p-3 bg-card border-border hover:border-border-hover transition-colors cursor-pointer", isPending && "border-warning/40")}>
        <div className="flex gap-3">
          {/* Product image */}
          <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-white flex-shrink-0">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-contain p-1"
                sizes="56px"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-[13px] leading-tight line-clamp-2">
                  {product.name}
                  {variant.sizeVariant && (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      — {variant.sizeVariant}
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(sale.saleDate)}
                  </span>
                  <CopyableSku sku={product.sku} fallback={product.name} className="text-[10px]" />
                  {sale.platform && (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-border capitalize"
                    >
                      {sale.platform}
                    </Badge>
                  )}
                  {isPending && (
                    <Badge className="text-[10px] bg-warning/20 text-warning border-warning/30 gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      En attente
                    </Badge>
                  )}
                  {sale.paymentMethod && sale.paymentMethod !== "platform_default" && (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-border"
                    >
                      {PAYMENT_METHODS.find((m) => m.value === sale.paymentMethod)?.label ?? sale.paymentMethod}
                    </Badge>
                  )}
                  {sale.buyerUsername && (
                    <span className="text-[10px] text-[#5865F2]">
                      @{sale.buyerUsername}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p
                  className={cn(
                    "text-sm font-bold",
                    profit >= 0 ? "text-success" : "text-danger"
                  )}
                >
                  {profit >= 0 ? "+" : ""}
                  {formatCurrency(profit)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {margin.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
              <span>
                Achat:{" "}
                {formatCurrency(Number(variant.purchasePrice))}
              </span>
              <span>
                Vente: {formatCurrency(Number(sale.salePrice))}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// --- Edit Sale Dialog ---

function EditSaleDialog({
  item,
  open,
  onOpenChange,
  userName,
}: {
  item: SaleItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string;
}) {
  const { sale, variant, product } = item;
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [editPlatform, setEditPlatform] = useState(sale.platform ?? "");
  const [editPaymentMethod, setEditPaymentMethod] = useState(sale.paymentMethod ?? "platform_default");

  const isPending = sale.paymentStatus === "pending";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(e.currentTarget);
      await updateSale(sale.id, {
        salePrice: Number(form.get("salePrice")),
        saleDate: form.get("saleDate") as string,
        platform: (form.get("platform") as string) || undefined,
        platformFee: Number(form.get("platformFee") || 0),
        shippingCost: Number(form.get("shippingCost") || 0),
        otherFees: Number(form.get("otherFees") || 0),
        buyerUsername: (form.get("buyerUsername") as string) || undefined,
        paymentStatus: (form.get("paymentStatus") as string) || undefined,
        paymentMethod: editPaymentMethod || undefined,
      });
      toast.success("Vente modifiée");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Erreur lors de la modification");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteSale(sale.id);
      toast.success("Vente supprimée - produit remis en stock");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleMarkPaid = async () => {
    setMarkingPaid(true);
    try {
      await markDealAsPaid(sale.id);
      toast.success("Paiement recu !");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Erreur");
    } finally {
      setMarkingPaid(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-sm leading-tight">
            {product.name}
            {variant.sizeVariant && (
              <span className="text-muted-foreground font-normal"> — {variant.sizeVariant}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Mark as paid button for pending deals */}
        {isPending && (
          <Button
            onClick={handleMarkPaid}
            disabled={markingPaid}
            className="w-full bg-warning/20 text-warning hover:bg-warning/30 border border-warning/30 gap-1.5"
            variant="outline"
          >
            {markingPaid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
            Paiement recu
          </Button>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-salePrice">Prix de vente *</Label>
            <Input
              id="edit-salePrice"
              name="salePrice"
              type="number"
              step="0.01"
              min="0"
              defaultValue={sale.salePrice}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-saleDate">Date de vente</Label>
            <Input
              id="edit-saleDate"
              name="saleDate"
              type="date"
              defaultValue={sale.saleDate}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Plateforme</Label>
            <Select value={editPlatform} onValueChange={setEditPlatform}>
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
            <input type="hidden" name="platform" value={editPlatform} />
          </div>

          <div className="space-y-1.5">
            <Label>Moyen de paiement</Label>
            <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Discord-specific fields */}
          {editPlatform === "discord" && (
            <div className="space-y-3 rounded-lg border border-[#5865F2]/30 bg-[#5865F2]/5 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-buyerUsername">Acheteur Discord</Label>
                <Input
                  id="edit-buyerUsername"
                  name="buyerUsername"
                  placeholder="@username"
                  defaultValue={sale.buyerUsername ?? ""}
                  className="bg-card"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Statut du paiement</Label>
                <Select name="paymentStatus" defaultValue={sale.paymentStatus ?? "paid"}>
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

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-platformFee">Commission</Label>
              <Input
                id="edit-platformFee"
                name="platformFee"
                type="number"
                step="0.01"
                min="0"
                defaultValue={sale.platformFee ?? "0"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-shippingCost">Envoi</Label>
              <Input
                id="edit-shippingCost"
                name="shippingCost"
                type="number"
                step="0.01"
                min="0"
                defaultValue={sale.shippingCost ?? "0"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-otherFees">Autres</Label>
              <Input
                id="edit-otherFees"
                name="otherFees"
                type="number"
                step="0.01"
                min="0"
                defaultValue={sale.otherFees ?? "0"}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={saving || deleting}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
            </Button>
          </div>
        </form>

        {/* Export */}
        <SaleExport
          sale={sale}
          variant={variant}
          product={product}
          userName={userName}
        />

        {/* Delete section */}
        <div className="border-t border-border pt-3 mt-1">
          {!confirmDelete ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-danger hover:text-danger hover:bg-danger/10 gap-1.5"
              onClick={() => setConfirmDelete(true)}
              disabled={saving || deleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer la vente
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                Le produit sera remis en stock. Confirmer ?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
