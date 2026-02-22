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
import { CATEGORIES } from "@/lib/utils/constants";
import { deleteProducts, getProductsWithSizes } from "@/lib/actions/product-actions";
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
}

interface StockClientProps {
  products: StockProduct[];
}

export function StockClient({ products }: StockClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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

  // Get categories that actually have products
  const usedCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => cats.add(p.category));
    return CATEGORIES.filter((c) => cats.has(c.value));
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
  }, [products, search, selectedCategory, showUnlisted, sortOldest]);

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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      await deleteProducts(Array.from(selectedIds));
      toast.success(`${selectedIds.size} produit${selectedIds.size > 1 ? "s" : ""} supprimé${selectedIds.size > 1 ? "s" : ""}`);
      setShowDeleteConfirm(false);
      exitSelectMode();
      router.refresh();
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateWts = async () => {
    if (selectedIds.size === 0) return;
    setWtsLoading(true);
    try {
      const productsData = await getProductsWithSizes(Array.from(selectedIds));

      let msg = "WTS 🔥\n";
      for (const product of productsData) {
        msg += "\n";
        msg += `📦 ${product.name}\n`;
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
          msg += `  • ${size}${count > 1 ? ` (x${count})` : ""}\n`;
        }
      }
      msg += "\nDM pour prix 💬";

      setWtsMessage(msg);
      setShowWtsDialog(true);
      setWtsCopied(false);
    } catch {
      toast.error("Erreur lors de la génération");
    } finally {
      setWtsLoading(false);
    }
  };

  const handleCopyWts = async () => {
    try {
      await navigator.clipboard.writeText(wtsMessage);
      setWtsCopied(true);
      toast.success("Message copié !");
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
      toast.success("CSV exporté !");
    } catch {
      toast.error("Erreur lors de l'export CSV");
    }
  };

  const selectedVariantCount = filtered
    .filter((p) => selectedIds.has(p.id))
    .reduce((sum, p) => sum + Number(p.totalCount), 0);

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
              {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
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
          {/* Action buttons row */}
          <div className="flex items-center justify-between gap-2">
            <div />
            <div className="flex items-center gap-1">
              {products.length > 0 && (
                <>
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
                </>
              )}
            </div>
          </div>

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
          {usedCategories.length > 1 && (
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

          {/* Sort + extra filters */}
          <div className="flex gap-1.5 flex-wrap">
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
              Non publie
            </button>
          </div>
        </>
      )}

      {/* Results count when filtering */}
      {(search || selectedCategory) && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} produit{filtered.length !== 1 ? "s" : ""} &middot;{" "}
          {totalInStock} unité{totalInStock !== 1 ? "s" : ""}
          {search && <span> pour &quot;{search}&quot;</span>}
        </p>
      )}

      {/* Product list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center py-12 text-sm text-muted-foreground">
            {products.length === 0
              ? "Aucun produit en stock"
              : "Aucun résultat"}
          </p>
        ) : (
          filtered.map((product) => (
            <div key={product.id} className="flex items-center gap-2">
              {selectMode && (
                <button
                  type="button"
                  onClick={() => toggleSelect(product.id)}
                  className="flex-shrink-0 p-1"
                >
                  {selectedIds.has(product.id) ? (
                    <CheckSquare className="h-5 w-5 text-primary" />
                  ) : (
                    <Square className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              )}
              <div className={cn("flex-1 min-w-0", selectMode && selectedIds.has(product.id) && "opacity-75")}>
                <ProductGroupCard product={product} />
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
            {selectedVariantCount} variant{selectedVariantCount > 1 ? "s" : ""} (y compris les ventes associées). Cette action est irréversible.
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
                  Copié !
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
