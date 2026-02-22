"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductGroupCard } from "./product-card";
import { CATEGORIES, STATUSES, PLATFORMS } from "@/lib/utils/constants";
import { deleteProducts, getProductsWithSizes, bulkListProducts } from "@/lib/actions/product-actions";
import {
  Search,
  X,
  Trash2,
  CheckSquare,
  Square,
  Loader2,
  Download,
  MessageSquare,
  Copy,
  Check,
  ArrowUpDown,
  Globe,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StockProduct {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  imageUrl: string | null;
  inStockCount: number;
  totalCount: number;
  totalValue: number;
  oldestPurchaseDate: string | null;
  nearestReturnDeadline: string | null;
  hasUnlistedVariants: boolean;
  variantStatuses: string[];
  allProductIds: string[];
}

interface StockClientProps {
  products: StockProduct[];
  adviceSkus: string[];
}

export function StockClient({ products, adviceSkus }: StockClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showWtsDialog, setShowWtsDialog] = useState(false);
  const [wtsMessage, setWtsMessage] = useState("");
  const [wtsLoading, setWtsLoading] = useState(false);
  const [wtsCopied, setWtsCopied] = useState(false);
  const [sortOldest, setSortOldest] = useState(false);
  const [showUnlisted, setShowUnlisted] = useState(false);
  const [showWithAdvice, setShowWithAdvice] = useState(false);
  const [showListingDialog, setShowListingDialog] = useState(false);
  const [listingLoading, setListingLoading] = useState<string | null>(null);

  // Get categories that actually have products
  const usedCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => cats.add(p.category));
    return CATEGORIES.filter((c) => cats.has(c.value));
  }, [products]);

  // Get statuses that actually exist in products + count variants per status
  const usedStatuses = useMemo(() => {
    const statusCount = new Map<string, number>();
    products.forEach((p) => {
      const statuses = p.variantStatuses ?? [];
      statuses.forEach((s) => {
        if (s) statusCount.set(s, (statusCount.get(s) ?? 0) + 1);
      });
    });
    return STATUSES
      .filter((s) => statusCount.has(s.value) && s.value !== "vendu")
      .map((s) => ({ ...s, count: statusCount.get(s.value) ?? 0 }));
  }, [products]);

  // Filter products
  const filtered = useMemo(() => {
    let result = products.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku?.toLowerCase().includes(q);
        if (!matchName && !matchSku) return false;
      }
      if (selectedCategory && p.category !== selectedCategory) return false;
      if (showUnlisted && !p.hasUnlistedVariants) return false;
      if (showWithAdvice && (!p.sku || !adviceSkus.includes(p.sku.toUpperCase()))) return false;
      if (selectedStatus) {
        const statuses = p.variantStatuses ?? [];
        if (!statuses.includes(selectedStatus)) return false;
      }
      return true;
    });
    if (sortOldest) {
      result = [...result].sort((a, b) => {
        const dateA = a.oldestPurchaseDate ?? "9999";
        const dateB = b.oldestPurchaseDate ?? "9999";
        return dateA.localeCompare(dateB);
      });
    }
    return result;
  }, [products, search, selectedCategory, showUnlisted, showWithAdvice, selectedStatus, sortOldest, adviceSkus]);

  const totalInStock = filtered.reduce(
    (sum, p) => sum + Number(p.inStockCount),
    0
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  /** Expand selected merged IDs to all underlying product IDs */
  const expandSelectedIds = () => {
    const allIds: string[] = [];
    for (const mp of filtered) {
      if (selectedIds.has(mp.id)) {
        allIds.push(...mp.allProductIds);
      }
    }
    return allIds;
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const allIds = expandSelectedIds();
      await deleteProducts(allIds);
      toast.success(`${selectedIds.size} produit${selectedIds.size > 1 ? "s" : ""} supprime${selectedIds.size > 1 ? "s" : ""}`);
      setShowDeleteConfirm(false);
      exitSelectMode();
      router.refresh();
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkList = async (platform: string) => {
    if (selectedIds.size === 0) return;
    setListingLoading(platform);
    try {
      const allIds = expandSelectedIds();
      await bulkListProducts(allIds, platform);
      const label = PLATFORMS.find((p) => p.value === platform)?.label ?? platform;
      toast.success(`Marque comme publie sur ${label}`);
      setShowListingDialog(false);
      exitSelectMode();
      router.refresh();
    } catch {
      toast.error("Erreur");
    } finally {
      setListingLoading(null);
    }
  };

  const handleGenerateWts = async () => {
    if (selectedIds.size === 0) return;
    setWtsLoading(true);
    try {
      const allIds = expandSelectedIds();
      const productsData = await getProductsWithSizes(allIds);

      let msg = "WTS\n";
      for (const product of productsData) {
        msg += "\n";
        msg += `${product.name}\n`;
        if (product.sku) {
          msg += `SKU: ${product.sku}\n`;
        }
        // Group sizes and count duplicates
        const sizeCounts = new Map<string, number>();
        for (const v of product.sizes) {
          const key = v.size || "OS";
          sizeCounts.set(key, (sizeCounts.get(key) ?? 0) + 1);
        }
        for (const [size, count] of sizeCounts) {
          msg += `  - ${size}${count > 1 ? ` (x${count})` : ""}\n`;
        }
      }
      msg += "\nDM pour prix";

      setWtsMessage(msg);
      setShowWtsDialog(true);
      setWtsCopied(false);
    } catch {
      toast.error("Erreur lors de la generation");
    } finally {
      setWtsLoading(false);
    }
  };

  const handleCopyWts = async () => {
    try {
      await navigator.clipboard.writeText(wtsMessage);
      setWtsCopied(true);
      toast.success("Message copie !");
      setTimeout(() => setWtsCopied(false), 2000);
    } catch {
      toast.error("Erreur lors de la copie");
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await fetch("/api/export/stock-csv");
      if (!res.ok) throw new Error("Erreur export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proxstock-stock-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exporte !");
    } catch {
      toast.error("Erreur lors de l'export CSV");
    }
  };

  const selectedVariantCount = filtered
    .filter((p) => selectedIds.has(p.id))
    .reduce((sum, p) => sum + Number(p.totalCount), 0);

  // Platforms for bulk listing (exclude discord + other)
  const listingPlatforms = PLATFORMS.filter(
    (p) => p.value !== "discord" && p.value !== "other"
  );

  const hasActiveFilters = search || selectedCategory || showUnlisted || showWithAdvice || selectedStatus;

  return (
    <>
      {selectMode ? (
        /* Select mode bar */
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1.5"
              onClick={toggleSelectAll}
            >
              {selectedIds.size === filtered.length ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              <span className="text-xs">Tout</span>
            </Button>
            <span className="text-xs text-muted-foreground">
              {selectedIds.size} selectionne{selectedIds.size > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {selectedIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={handleGenerateWts}
                  disabled={wtsLoading}
                >
                  {wtsLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5" />
                  )}
                  WTS
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setShowListingDialog(true)}
                >
                  <Globe className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={exitSelectMode}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border h-9 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category chips */}
          {usedCategories.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-colors",
                  !selectedCategory
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-card border-border text-muted-foreground hover:border-border-hover"
                )}
              >
                Toutes
              </button>
              {usedCategories.map((c) => (
                <button
                  key={c.value}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === c.value ? null : c.value
                    )
                  }
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-colors",
                    selectedCategory === c.value
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-card border-border text-muted-foreground hover:border-border-hover"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {/* Status filter chips */}
          {usedStatuses.length > 1 && (
            <div className="flex gap-1.5 flex-wrap">
              {usedStatuses.map((s) => (
                <button
                  key={s.value}
                  onClick={() =>
                    setSelectedStatus(
                      selectedStatus === s.value ? null : s.value
                    )
                  }
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1",
                    selectedStatus === s.value
                      ? `${s.color}/20 border-current`
                      : "bg-card border-border text-muted-foreground hover:border-border-hover"
                  )}
                  style={selectedStatus === s.value ? { color: `var(--${s.color.replace("bg-", "")})` } : undefined}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", s.color)} />
                  {s.label}
                  <span className="text-[10px] opacity-60">{s.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Sort + extra filters + action buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSortOldest(!sortOldest)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1",
                sortOldest
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-card border-border text-muted-foreground hover:border-border-hover"
              )}
            >
              <ArrowUpDown className="h-3 w-3" />
              Plus ancien
            </button>
            <button
              onClick={() => setShowUnlisted(!showUnlisted)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                showUnlisted
                  ? "bg-warning/20 text-warning border-warning/40"
                  : "bg-card border-border text-muted-foreground hover:border-border-hover"
              )}
            >
              Non liste
            </button>
            {adviceSkus.length > 0 && (
              <button
                onClick={() => setShowWithAdvice(!showWithAdvice)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1",
                  showWithAdvice
                    ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                    : "bg-card border-border text-muted-foreground hover:border-border-hover"
                )}
              >
                <Info className="h-3 w-3" />
                Message admin
              </button>
            )}
            {products.length > 0 && (
              <div className="flex items-center gap-0.5 ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-muted-foreground hover:text-foreground"
                  onClick={handleExportCsv}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectMode(true)}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Results count when filtering */}
      {hasActiveFilters && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} produit{filtered.length !== 1 ? "s" : ""} &middot;{" "}
          {totalInStock} unite{totalInStock !== 1 ? "s" : ""}
          {search && <span> pour &quot;{search}&quot;</span>}
        </p>
      )}

      {/* Product list — stack on mobile, 2-col grid on desktop */}
      <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3">
        {filtered.length === 0 ? (
          <p className="text-center py-12 text-sm text-muted-foreground lg:col-span-2">
            {products.length === 0
              ? "Aucun produit en stock"
              : "Aucun resultat"}
          </p>
        ) : (
          filtered.map((product) => (
            <div
              key={product.id}
              className={cn("flex items-center gap-2", selectMode && "cursor-pointer")}
              onClick={selectMode ? () => toggleSelect(product.id) : undefined}
            >
              {selectMode && (
                <div className="flex-shrink-0 p-1">
                  {selectedIds.has(product.id) ? (
                    <CheckSquare className="h-5 w-5 text-primary" />
                  ) : (
                    <Square className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              )}
              <div className={cn("flex-1 min-w-0", selectMode && selectedIds.has(product.id) && "opacity-75")}>
                <ProductGroupCard
                  product={product}
                  hasAdvice={!!product.sku && adviceSkus.includes(product.sku.toUpperCase())}
                  disableLink={selectMode}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Supprimer {selectedIds.size} produit{selectedIds.size > 1 ? "s" : ""} ?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cette action supprimera {selectedIds.size} produit{selectedIds.size > 1 ? "s" : ""} et{" "}
            {selectedVariantCount} variant{selectedVariantCount > 1 ? "s" : ""} (y compris les ventes associees). Cette action est irreversible.
          </p>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleBulkDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Supprimer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk listing dialog */}
      <Dialog open={showListingDialog} onOpenChange={setShowListingDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Marquer comme publie sur...
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {listingPlatforms.map((p) => (
              <button
                key={p.value}
                disabled={listingLoading !== null}
                onClick={() => handleBulkList(p.value)}
                className="text-sm px-4 py-2 rounded-lg border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
              >
                {listingLoading === p.value ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  p.label
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* WTS Message dialog */}
      <Dialog open={showWtsDialog} onOpenChange={setShowWtsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Message WTS
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <pre className="text-sm whitespace-pre-wrap bg-secondary/50 rounded-lg p-4 border border-border max-h-80 overflow-y-auto font-sans leading-relaxed">
                {wtsMessage}
              </pre>
            </div>
            <Button
              className="w-full gap-2"
              onClick={handleCopyWts}
            >
              {wtsCopied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copie !
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copier le message
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
