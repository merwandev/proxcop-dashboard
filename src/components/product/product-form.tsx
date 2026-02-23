"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyableSku } from "@/components/ui/copyable-sku";
import { CATEGORIES, STORAGE_LOCATIONS } from "@/lib/utils/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createProductWithVariants } from "@/lib/actions/product-actions";
import { createSupplierAction } from "@/lib/actions/supplier-actions";
// Upload via server-side proxy (avoids R2 CORS issues)
import { Loader2, Search, Plus, Minus, Package, Upload, ArrowLeft, X, Link2, Camera } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { SkuSalesSection } from "@/components/product/sku-sales-section";
import { BarcodeScanner } from "@/components/product/barcode-scanner";

// ─── Types ──────────────────────────────────────────────────────────

interface StockXVariant {
  variantId: string;
  sizeUS: string;
  sizeEU: string | null;
}

interface SelectedVariant {
  sizeUS: string;
  sizeEU: string | null;
  purchasePrice: string;
  quantity: number;
  storageLocation: string;
}

interface SearchResult {
  productId: string;
  title: string;
  styleId: string;
  imageUrl: string | null;
}

interface AdminSearchResult {
  id: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  category: string;
  sizes: string[];
}

type WizardStep = "search" | "sizes" | "manual";

// ─── Return Deadline Picker ─────────────────────────────────────────

function addDays(days: number, from?: string): string {
  const d = from ? new Date(from + "T00:00:00") : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function ReturnDeadlinePicker({
  value,
  onChange,
  baseDate,
}: {
  value: string;
  onChange: (v: string) => void;
  baseDate?: string;
}) {
  const is14 = value === addDays(14, baseDate);
  const is30 = value === addDays(30, baseDate);
  const isCustom = value && !is14 && !is30;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onChange(addDays(14, baseDate))}
          className={cn(
            "text-[11px] px-2.5 py-1 rounded-md border transition-colors",
            is14
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-secondary border-border text-muted-foreground hover:border-border-hover"
          )}
        >
          14j
        </button>
        <button
          type="button"
          onClick={() => onChange(addDays(30, baseDate))}
          className={cn(
            "text-[11px] px-2.5 py-1 rounded-md border transition-colors",
            is30
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-secondary border-border text-muted-foreground hover:border-border-hover"
          )}
        >
          30j
        </button>
        <button
          type="button"
          onClick={() => onChange("")}
          className={cn(
            "text-[11px] px-2.5 py-1 rounded-md border transition-colors",
            !value
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-secondary border-border text-muted-foreground hover:border-border-hover"
          )}
        >
          Aucun
        </button>
      </div>
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("h-9 text-sm w-full", isCustom && "border-primary")}
      />
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────

interface SupplierOption {
  id: string;
  name: string;
  returnDays: string | null;
}

interface QuickProduct {
  name: string;
  sku: string | null;
  imageUrl: string | null;
  category?: string;
  addCount?: number;
}

interface ProductFormProps {
  suppliers?: SupplierOption[];
  recentProducts?: QuickProduct[];
  trendingProducts?: QuickProduct[];
}

export function ProductForm({ suppliers = [], recentProducts = [], trendingProducts = [] }: ProductFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("search");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search state
  const [searchInput, setSearchInput] = useState("");
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "found" | "not_found" | "error">("idle");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [adminResults, setAdminResults] = useState<AdminSearchResult[]>([]);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);

  // Product state (after selection)
  const [productTitle, setProductTitle] = useState("");
  const [productSku, setProductSku] = useState("");
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  const [availableSizes, setAvailableSizes] = useState<StockXVariant[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Size selection state
  const [selectedSizes, setSelectedSizes] = useState<Map<string, SelectedVariant>>(new Map());
  const [globalPurchaseDate, setGlobalPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [globalTargetPrice, setGlobalTargetPrice] = useState("");
  const [returnDaysOffset, setReturnDaysOffset] = useState<number | null>(14);
  const [globalReturnDeadline, setGlobalReturnDeadline] = useState(() => addDays(14));
  const [globalStorageLocation, setGlobalStorageLocation] = useState("home");
  const [globalSupplierName, setGlobalSupplierName] = useState("");
  const [notes, setNotes] = useState("");

  // Manual mode state
  const [manualName, setManualName] = useState("");
  const [manualCategory, setManualCategory] = useState<string>("sneakers");
  const [manualSize, setManualSize] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualQuantity, setManualQuantity] = useState(1);
  const [manualImageUrl, setManualImageUrl] = useState<string | null>(null);
  const [manualUploading, setManualUploading] = useState(false);

  // Median price state
  const [medianPrice, setMedianPrice] = useState<{ median: number; saleCount: number } | null>(null);

  // Community sales state
  const [skuSales, setSkuSales] = useState<{ saleId: string; salePrice: number; saleDate: string; platform: string | null; sizeVariant: string | null }[]>([]);

  // Supplier select state
  const [localSuppliers, setLocalSuppliers] = useState(suppliers);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [showCustomSupplier, setShowCustomSupplier] = useState(false);
  const [showAddSupplierDialog, setShowAddSupplierDialog] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierReturnDays, setNewSupplierReturnDays] = useState("none");
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);

  // Handler: supplier change → auto-fill return deadline + name
  const handleSupplierChange = (value: string) => {
    if (value === "__add_new__") {
      setShowAddSupplierDialog(true);
      return;
    }
    setSelectedSupplierId(value);
    if (value === "__other__") {
      setShowCustomSupplier(true);
      setGlobalSupplierName("");
      return;
    }
    setShowCustomSupplier(false);
    const supplier = localSuppliers.find((s) => s.id === value);
    if (supplier) {
      setGlobalSupplierName(supplier.name);
      if (supplier.returnDays) {
        const days = Number(supplier.returnDays);
        setReturnDaysOffset(days);
        setGlobalReturnDeadline(addDays(days, globalPurchaseDate));
      }
    }
  };

  // Handler: purchase date change → recalculate return deadline
  const handlePurchaseDateChange = (newDate: string) => {
    setGlobalPurchaseDate(newDate);
    if (returnDaysOffset !== null && newDate) {
      setGlobalReturnDeadline(addDays(returnDaysOffset, newDate));
    }
  };

  // Handler: return deadline change → track offset
  const handleReturnDeadlineChange = (newDeadline: string) => {
    setGlobalReturnDeadline(newDeadline);
    if (!newDeadline) {
      setReturnDaysOffset(null);
    } else if (globalPurchaseDate) {
      const base = new Date(globalPurchaseDate + "T00:00:00");
      const target = new Date(newDeadline + "T00:00:00");
      const diff = Math.round((target.getTime() - base.getTime()) / 86400000);
      if (diff === 14 || diff === 30) {
        setReturnDaysOffset(diff);
      } else {
        setReturnDaysOffset(null);
      }
    }
  };

  // Handler: add new supplier from dialog
  const handleAddNewSupplier = async () => {
    const name = newSupplierName.trim();
    if (!name) { toast.error("Nom requis"); return; }
    setIsAddingSupplier(true);
    try {
      const returnDays = newSupplierReturnDays === "none" ? null : newSupplierReturnDays;
      const supplier = await createSupplierAction({ name, returnDays });
      setLocalSuppliers((prev) => [...prev, { id: supplier.id, name: supplier.name, returnDays: supplier.returnDays }].sort((a, b) => a.name.localeCompare(b.name)));
      // Auto-select the new supplier
      setSelectedSupplierId(supplier.id);
      setShowCustomSupplier(false);
      setGlobalSupplierName(supplier.name);
      if (supplier.returnDays) {
        const days = Number(supplier.returnDays);
        setReturnDaysOffset(days);
        setGlobalReturnDeadline(addDays(days, globalPurchaseDate));
      }
      setShowAddSupplierDialog(false);
      setNewSupplierName("");
      setNewSupplierReturnDays("none");
      toast.success("Fournisseur ajoute");
    } catch {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setIsAddingSupplier(false);
    }
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // Fetch median price when SKU is set
  useEffect(() => {
    if (!productSku) { setMedianPrice(null); return; }
    let cancelled = false;
    fetch(`/api/median-price?sku=${encodeURIComponent(productSku)}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled && data.median) setMedianPrice(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [productSku]);

  // Fetch community sales when SKU is set
  useEffect(() => {
    if (!productSku) { setSkuSales([]); return; }
    let cancelled = false;
    fetch(`/api/sku-sales?sku=${encodeURIComponent(productSku)}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled && data.sales) setSkuSales(data.sales); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [productSku]);

  // ─── Detect if input looks like a SKU ─────────────────────────────

  const looksLikeSku = useCallback((input: string) => {
    const trimmed = input.trim();
    return /^[A-Za-z0-9]+-[A-Za-z0-9]+$/.test(trimmed);
  }, []);

  // ─── Auto-search on input change (1000ms debounce) ────────────────

  // Helper: search admin products
  const searchAdminProductsApi = useCallback(async (query: string): Promise<AdminSearchResult[]> => {
    try {
      const res = await fetch(`/api/admin-products/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      return data.products ?? [];
    } catch {
      return [];
    }
  }, []);

  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchStatus("idle");
      setSearchResults([]);
      setAdminResults([]);
      return;
    }

    setSearchStatus("loading");
    setSearchResults([]);
    setAdminResults([]);

    const isSku = looksLikeSku(query);

    if (isSku) {
      // Direct SKU lookup — single result, go straight to sizes
      try {
        const res = await fetch(`/api/sku-lookup?sku=${encodeURIComponent(query)}&mode=full`);
        const data = await res.json();

        if (data.status === "found" && data.variants?.length > 0) {
          setProductTitle(data.title || "");
          setProductSku(query.toUpperCase());
          setProductImageUrl(data.imageUrl || null);
          setAvailableSizes(data.variants);
          setSearchStatus("found");
          setStep("sizes");
          return;
        }
      } catch {
        // Fall through to text search
      }
    }

    // Text search + admin products search in parallel
    try {
      const [stockxRes, adminProds] = await Promise.all([
        fetch(`/api/stockx/search?q=${encodeURIComponent(query)}`).then((r) => r.json()),
        searchAdminProductsApi(query),
      ]);

      setAdminResults(adminProds);

      if (stockxRes.status === "error" && adminProds.length === 0) {
        setSearchStatus("error");
        return;
      }

      const hasStockX = stockxRes.products && stockxRes.products.length > 0;
      if (hasStockX) {
        setSearchResults(stockxRes.products);
      }

      if (hasStockX || adminProds.length > 0) {
        setSearchStatus("found");
      } else {
        setSearchStatus("not_found");
      }
    } catch {
      setSearchStatus("error");
    }
  }, [looksLikeSku, searchAdminProductsApi]);

  // Debounced auto-search: triggers 1000ms after user stops typing
  const handleSearchInputChange = useCallback((value: string) => {
    setSearchInput(value);
    setSearchStatus(value.trim().length >= 2 ? "idle" : "idle");
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value.trim());
      }, 1000);
    } else {
      setSearchResults([]);
      setAdminResults([]);
    }
  }, [performSearch]);

  // Instant search on Enter key
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      performSearch(searchInput.trim());
    }
  }, [searchInput, performSearch]);

  // ─── Barcode scan handler ──────────────────────────────────────────

  const handleBarcodeScan = useCallback(async (gtin: string) => {
    setShowScanner(false);
    setScanLoading(true);
    setSearchStatus("loading");
    setSearchInput(gtin);

    try {
      const res = await fetch(`/api/stockx/gtin/${encodeURIComponent(gtin)}`);
      const data = await res.json();

      if (data.status === "found" && data.variants?.length > 0) {
        setProductTitle(data.title || "");
        setProductSku(data.styleId || "");
        setProductImageUrl(data.imageUrl || null);
        setAvailableSizes(data.variants);
        setSearchStatus("found");
        setStep("sizes");
        const displayName = data.variantName || data.title || "Produit";
        toast.success(`Trouve : ${displayName}`);
      } else {
        setSearchStatus("not_found");
        toast.error("Aucun produit trouve pour ce code-barres");
      }
    } catch {
      setSearchStatus("error");
      toast.error("Erreur lors de la recherche");
    } finally {
      setScanLoading(false);
    }
  }, []);

  // ─── Select a product from search results ─────────────────────────

  const handleSelectProduct = useCallback(async (product: SearchResult) => {
    setLoadingProductId(product.productId);

    try {
      const params = new URLSearchParams({
        productId: product.productId,
        title: product.title,
        styleId: product.styleId,
      });
      if (product.imageUrl) params.set("imageUrl", product.imageUrl);

      const res = await fetch(`/api/stockx/search?${params.toString()}`);
      const data = await res.json();

      if (data.status === "found" && data.variants?.length > 0) {
        setProductTitle(data.title || product.title);
        setProductSku(data.styleId || product.styleId);
        setProductImageUrl(data.imageUrl || product.imageUrl || null);
        setAvailableSizes(data.variants);
        setStep("sizes");
      } else if (data.status === "error") {
        toast.error("Service StockX indisponible");
      } else {
        toast.error("Aucune taille trouvée pour ce produit");
      }
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoadingProductId(null);
    }
  }, []);

  // ─── Select an admin product ────────────────────────────────────

  const handleSelectAdminProduct = useCallback(async (product: AdminSearchResult) => {
    // If admin product has a SKU, try StockX lookup first
    if (product.sku && looksLikeSku(product.sku)) {
      setLoadingProductId(product.id);
      try {
        const res = await fetch(`/api/sku-lookup?sku=${encodeURIComponent(product.sku)}&mode=full`);
        const data = await res.json();
        if (data.status === "found" && data.variants?.length > 0) {
          setProductTitle(data.title || product.name);
          setProductSku(product.sku.toUpperCase());
          setProductImageUrl(data.imageUrl || product.imageUrl || null);
          setAvailableSizes(data.variants);
          setStep("sizes");
          setLoadingProductId(null);
          return;
        }
      } catch {
        // Fall through to custom sizes
      }
      setLoadingProductId(null);
    }

    // If admin product has custom sizes, use them as StockX-like variants
    if (product.sizes.length > 0) {
      setProductTitle(product.name);
      setProductSku(product.sku?.toUpperCase() || "");
      setProductImageUrl(product.imageUrl || null);
      setAvailableSizes(
        product.sizes.map((s, i) => ({
          variantId: `admin-${i}`,
          sizeUS: s,
          sizeEU: null,
        }))
      );
      setStep("sizes");
      return;
    }

    // Fallback: go to manual mode with pre-filled info
    setManualName(product.name);
    setManualCategory(product.category);
    setManualImageUrl(product.imageUrl);
    setStep("manual");
  }, [looksLikeSku]);

  // ─── Size Selection ─────────────────────────────────────────────

  const toggleSize = useCallback((sizeUS: string, sizeEU: string | null) => {
    setSelectedSizes((prev) => {
      const next = new Map(prev);
      if (next.has(sizeUS)) {
        next.delete(sizeUS);
      } else {
        next.set(sizeUS, { sizeUS, sizeEU, purchasePrice: "", quantity: 1, storageLocation: "" });
      }
      return next;
    });
  }, []);

  const updateSizeField = useCallback((size: string, field: keyof SelectedVariant, value: string | number) => {
    setSelectedSizes((prev) => {
      const next = new Map(prev);
      const current = next.get(size);
      if (current) next.set(size, { ...current, [field]: value });
      return next;
    });
  }, []);

  // ─── Manual Image Upload ────────────────────────────────────────

  const handleManualImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setManualUploading(true);
    try {
      const { default: imageCompression } = await import("browser-image-compression");
      const compressed = await imageCompression(file, { maxWidthOrHeight: 800, maxSizeMB: 0.2, useWebWorker: true });
      const formData = new FormData();
      formData.append("file", compressed);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { publicUrl } = await uploadRes.json();
      setManualImageUrl(publicUrl);
      toast.success("Image ajoutee");
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setManualUploading(false);
    }
  }, []);

  // ─── Submit ─────────────────────────────────────────────────────

  const handleSubmitStockX = useCallback(async () => {
    if (selectedSizes.size === 0) { toast.error("Selectionnez au moins une taille"); return; }
    for (const [size, data] of selectedSizes) {
      if (!data.purchasePrice || Number(data.purchasePrice) <= 0) { toast.error(`Prix d'achat requis pour la taille ${size}`); return; }
    }
    setIsSubmitting(true);
    try {
      await createProductWithVariants({
        name: productTitle, sku: productSku, imageUrl: productImageUrl || undefined,
        category: "sneakers", purchaseDate: globalPurchaseDate,
        targetPrice: globalTargetPrice ? Number(globalTargetPrice) : undefined,
        returnDeadline: globalReturnDeadline || undefined, notes: notes || undefined,
        supplierName: globalSupplierName || undefined,
        variants: Array.from(selectedSizes.values()).map((v) => ({
          sizeVariant: v.sizeEU ? `US ${v.sizeUS} / EU ${v.sizeEU}` : `US ${v.sizeUS}`,
          purchasePrice: Number(v.purchasePrice), quantity: v.quantity,
          storageLocation: v.storageLocation || globalStorageLocation || undefined,
        })),
      });
      toast.success("Produit ajoute au stock !");
      router.push("/stock");
    } catch (e) {
      toast.error((e as Error).message || "Erreur lors de l'ajout");
    } finally { setIsSubmitting(false); }
  }, [selectedSizes, productTitle, productSku, productImageUrl, globalPurchaseDate, globalTargetPrice, globalReturnDeadline, globalStorageLocation, globalSupplierName, notes, router]);

  const handleSubmitManual = useCallback(async () => {
    if (!manualName.trim()) { toast.error("Le nom du produit est requis"); return; }
    if (!manualPrice || Number(manualPrice) <= 0) { toast.error("Le prix d'achat est requis"); return; }
    setIsSubmitting(true);
    try {
      await createProductWithVariants({
        name: manualName.trim(), imageUrl: manualImageUrl || undefined,
        category: manualCategory as "sneakers" | "pokemon" | "lego" | "random",
        purchaseDate: globalPurchaseDate,
        targetPrice: globalTargetPrice ? Number(globalTargetPrice) : undefined,
        returnDeadline: globalReturnDeadline || undefined, notes: notes || undefined,
        supplierName: globalSupplierName || undefined,
        variants: [{ sizeVariant: manualSize || undefined, purchasePrice: Number(manualPrice), quantity: manualQuantity, storageLocation: globalStorageLocation || undefined }],
      });
      toast.success("Produit ajoute au stock !");
      router.push("/stock");
    } catch (e) {
      toast.error((e as Error).message || "Erreur lors de l'ajout");
    } finally { setIsSubmitting(false); }
  }, [manualName, manualCategory, manualSize, manualPrice, manualQuantity, manualImageUrl, globalPurchaseDate, globalTargetPrice, globalReturnDeadline, globalStorageLocation, globalSupplierName, notes, router]);

  // ─── Add Supplier Dialog (shared across steps) ─────────────────

  const addSupplierDialog = (
    <Dialog open={showAddSupplierDialog} onOpenChange={setShowAddSupplierDialog}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nouveau fournisseur</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nom</Label>
            <Input
              placeholder="Nom du fournisseur..."
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
              className="h-9 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddNewSupplier(); } }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Delai de retour</Label>
            <Select value={newSupplierReturnDays} onValueChange={setNewSupplierReturnDays}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                <SelectItem value="14">14 jours</SelectItem>
                <SelectItem value="30">30 jours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAddNewSupplier} disabled={isAddingSupplier || !newSupplierName.trim()} className="w-full h-10">
            {isAddingSupplier ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1.5" />Ajouter</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // ─── Render: Search Step (with inline results) ─────────────────

  if (step === "search") {
    return (
      <div className="space-y-5">
        {/* Search input */}
        <div className="space-y-2">
          <Label htmlFor="product-search" className="text-base font-semibold">
            Rechercher un produit
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="product-search"
                placeholder="Nike Dunk Low, DD1391-100..."
                value={searchInput}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-9 pr-10 h-11"
                autoFocus
              />
              {(searchStatus === "loading" || scanLoading) && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
              )}
              {searchInput && searchStatus !== "loading" && !scanLoading && (
                <button
                  type="button"
                  onClick={() => { handleSearchInputChange(""); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 flex-shrink-0"
              onClick={() => setShowScanner(true)}
              disabled={scanLoading}
            >
              <Camera className="h-4.5 w-4.5" />
            </Button>
          </div>
          {searchStatus === "idle" && searchInput.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              Tapez un SKU ou un nom — la recherche se lance automatiquement
            </p>
          )}
        </div>

        {/* Recent + Trending (shown only when search is idle) */}
        {searchStatus === "idle" && searchInput.length === 0 && (
          <>
            {recentProducts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Ajoutes recemment</p>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {recentProducts.map((p, i) => (
                    <button
                      key={p.sku ?? i}
                      type="button"
                      onClick={() => {
                        if (p.sku) {
                          handleSearchInputChange(p.sku);
                          setTimeout(() => performSearch(p.sku!), 0);
                        } else {
                          handleSearchInputChange(p.name);
                          setTimeout(() => performSearch(p.name), 0);
                        }
                      }}
                      className="flex-shrink-0 flex items-center gap-2 p-2 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors max-w-[200px]"
                    >
                      <div className="relative h-10 w-10 rounded overflow-hidden bg-white flex-shrink-0">
                        {p.imageUrl ? (
                          <Image src={p.imageUrl} alt={p.name} fill className="object-contain p-0.5" sizes="40px" />
                        ) : (
                          <div className="flex items-center justify-center h-full"><Package className="h-4 w-4 text-muted-foreground" /></div>
                        )}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-[11px] font-medium leading-tight truncate">{p.name}</p>
                        {p.sku && <p className="text-[9px] text-muted-foreground font-mono truncate">{p.sku}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {trendingProducts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Tendances (7 jours)</p>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {trendingProducts.map((p, i) => (
                    <button
                      key={p.sku ?? i}
                      type="button"
                      onClick={() => {
                        if (p.sku) {
                          handleSearchInputChange(p.sku);
                          setTimeout(() => performSearch(p.sku!), 0);
                        } else {
                          handleSearchInputChange(p.name);
                          setTimeout(() => performSearch(p.name), 0);
                        }
                      }}
                      className="flex-shrink-0 flex items-center gap-2 p-2 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors max-w-[200px]"
                    >
                      <div className="relative h-10 w-10 rounded overflow-hidden bg-white flex-shrink-0">
                        {p.imageUrl ? (
                          <Image src={p.imageUrl} alt={p.name} fill className="object-contain p-0.5" sizes="40px" />
                        ) : (
                          <div className="flex items-center justify-center h-full"><Package className="h-4 w-4 text-muted-foreground" /></div>
                        )}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-[11px] font-medium leading-tight truncate">{p.name}</p>
                        <p className="text-[9px] text-muted-foreground">
                          {p.addCount} ajout{Number(p.addCount) > 1 ? "s" : ""}
                          {p.sku && <span className="font-mono ml-1">{p.sku}</span>}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Loading skeleton */}
        {searchStatus === "loading" && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 animate-pulse">
                <div className="h-16 w-16 rounded-lg bg-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-secondary rounded w-3/4" />
                  <div className="h-2.5 bg-secondary rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Admin product results */}
        {searchStatus === "found" && adminResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Produits Proxcop
            </p>
            <div className="space-y-1.5">
              {adminResults.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  disabled={loadingProductId !== null}
                  onClick={() => handleSelectAdminProduct(product)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left",
                    "bg-card border-primary/30 hover:border-primary/60 hover:bg-secondary/50 active:scale-[0.98]",
                    loadingProductId === product.id && "border-primary/50 bg-secondary/50"
                  )}
                >
                  <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-white flex-shrink-0">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-1.5" />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-white/5"><Package className="h-5 w-5 text-muted-foreground" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium leading-tight line-clamp-2">{product.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-primary/20 text-primary border-0">
                        Admin
                      </Badge>
                      {product.sku && (
                        <span className="text-[11px] text-muted-foreground font-mono">{product.sku}</span>
                      )}
                      {product.sizes.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">{product.sizes.length} tailles</span>
                      )}
                    </div>
                  </div>
                  {loadingProductId === product.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                  ) : (
                    <ArrowLeft className="h-4 w-4 text-muted-foreground/40 rotate-180 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Inline search results with images */}
        {searchStatus === "found" && searchResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {searchResults.length} résultat{searchResults.length > 1 ? "s" : ""} StockX — choisissez un produit
            </p>
            <div className="space-y-1.5">
              {searchResults.map((product) => (
                <button
                  key={product.productId}
                  type="button"
                  disabled={loadingProductId !== null}
                  onClick={() => handleSelectProduct(product)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left",
                    "bg-card border-border hover:border-primary/40 hover:bg-secondary/50 active:scale-[0.98]",
                    loadingProductId === product.productId && "border-primary/50 bg-secondary/50"
                  )}
                >
                  <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-white flex-shrink-0">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt={product.title} className="w-full h-full object-contain p-1.5" />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-white/5"><Package className="h-5 w-5 text-muted-foreground" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight line-clamp-2">{product.title}</p>
                    {product.styleId && (
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{product.styleId}</p>
                    )}
                  </div>
                  {loadingProductId === product.productId ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                  ) : (
                    <ArrowLeft className="h-4 w-4 text-muted-foreground/40 rotate-180 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {searchStatus === "not_found" && (
          <div className="rounded-xl bg-secondary/50 p-5 text-center space-y-1">
            <Package className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Aucun résultat</p>
            <p className="text-xs text-muted-foreground/70">
              Pas de produit trouvé pour &quot;{searchInput}&quot;
            </p>
          </div>
        )}

        {/* Error */}
        {searchStatus === "error" && (
          <div className="rounded-xl bg-secondary/50 p-5 text-center space-y-1">
            <p className="text-sm text-muted-foreground">Service de search temporairement indisponible</p>
            <p className="text-xs text-muted-foreground/70">Réessayez ou ajoutez manuellement</p>
          </div>
        )}

        {/* Manual add */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-background px-3 text-muted-foreground">ou</span></div>
        </div>

        <Button variant="outline" className="w-full h-12" onClick={() => setStep("manual")}>
          <Package className="h-4 w-4 mr-2" />
          Ajouter manuellement
        </Button>

        <BarcodeScanner
          open={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleBarcodeScan}
        />
      </div>
    );
  }

  // ─── Render: Size Selection Step ────────────────────────────────

  if (step === "sizes") {
    return (
      <div className="space-y-5">
        <button type="button" onClick={() => { setStep("search"); setSelectedSizes(new Map()); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex gap-4">
            <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-white flex-shrink-0">
              {productImageUrl ? (
                <Image
                  src={productImageUrl}
                  alt={productTitle}
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
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2">{productTitle}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  Sneakers
                </Badge>
                {productSku && (
                  <CopyableSku sku={productSku} className="text-[10px]" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold">Selectionnez les tailles ({selectedSizes.size} selectionnee{selectedSizes.size > 1 ? "s" : ""})</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {availableSizes.map((v) => {
              const isSelected = selectedSizes.has(v.sizeUS);
              return (
                <button key={v.variantId} type="button" onClick={() => toggleSize(v.sizeUS, v.sizeEU)} className={cn("py-2 px-1 rounded-lg font-medium transition-all min-h-[44px] flex flex-col items-center justify-center gap-0.5", isSelected ? "bg-primary text-primary-foreground ring-2 ring-primary/50" : "bg-secondary hover:bg-secondary/80 text-muted-foreground")}>
                  <span className="text-xs">US {v.sizeUS}</span>
                  {v.sizeEU && <span className={cn("text-[9px]", isSelected ? "text-primary-foreground/70" : "text-muted-foreground/60")}>EU {v.sizeEU}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {selectedSizes.size > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Prix par taille</Label>
            {Array.from(selectedSizes.entries()).map(([size, data]) => (
              <div key={size} className="rounded-xl bg-secondary p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">US {size}{data.sizeEU ? ` / EU ${data.sizeEU}` : ""}</span>
                  <button type="button" onClick={() => toggleSize(size, data.sizeEU)} className="text-xs text-muted-foreground hover:text-danger transition-colors">Retirer</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Prix d&apos;achat *</Label>
                    <Input type="number" step="0.01" min="0" placeholder="120.00" value={data.purchasePrice} onChange={(e) => updateSizeField(size, "purchasePrice", e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Quantite</Label>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => updateSizeField(size, "quantity", Math.max(1, data.quantity - 1))}><Minus className="h-3 w-3" /></Button>
                      <Input type="number" min="1" value={data.quantity} onChange={(e) => updateSizeField(size, "quantity", Math.max(1, parseInt(e.target.value) || 1))} className="h-9 text-sm text-center" />
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => updateSizeField(size, "quantity", data.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 pt-2 border-t border-border">
          <Label className="text-sm font-semibold">Infos globales</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 min-w-0 overflow-hidden">
              <Label className="text-[11px] text-muted-foreground">Date d&apos;achat *</Label>
              <Input type="date" value={globalPurchaseDate} onChange={(e) => handlePurchaseDateChange(e.target.value)} className="h-9 text-sm w-full" />
            </div>
            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] text-muted-foreground">Prix cible</Label>
              <Input type="number" step="0.01" min="0" placeholder={medianPrice ? `~${Math.round(medianPrice.median)}` : "180.00"} value={globalTargetPrice} onChange={(e) => setGlobalTargetPrice(e.target.value)} className="h-9 text-sm" />
              {medianPrice && (
                <button
                  type="button"
                  onClick={() => setGlobalTargetPrice(String(Math.round(medianPrice.median)))}
                  className="text-[10px] text-primary hover:underline"
                >
                  Mediane membres : {formatCurrency(medianPrice.median)} ({medianPrice.saleCount} ventes)
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] text-muted-foreground">Stockage</Label>
              <Select value={globalStorageLocation} onValueChange={setGlobalStorageLocation}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>{STORAGE_LOCATIONS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1 min-w-0 overflow-hidden">
              <Label className="text-[11px] text-muted-foreground">Date retour</Label>
              <ReturnDeadlinePicker value={globalReturnDeadline} onChange={handleReturnDeadlineChange} baseDate={globalPurchaseDate} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Fournisseur</Label>
            <div className="space-y-1.5">
              <Select value={selectedSupplierId} onValueChange={handleSupplierChange}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  {localSuppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}{s.returnDays ? ` (${s.returnDays}j)` : ""}</SelectItem>
                  ))}
                  <SelectItem value="__other__">Autre</SelectItem>
                  <SelectItem value="__add_new__">+ Nouveau fournisseur</SelectItem>
                </SelectContent>
              </Select>
              {showCustomSupplier && (
                <Input placeholder="Nom du fournisseur..." value={globalSupplierName} onChange={(e) => setGlobalSupplierName(e.target.value)} className="h-9 text-sm" />
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Notes</Label>
            <Textarea placeholder="Notes supplementaires..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-sm" />
          </div>
        </div>

        {/* Community sales for this SKU */}
        {skuSales.length > 0 && (
          <div className="pt-2 border-t border-border">
            <SkuSalesSection sales={skuSales} sku={productSku} />
          </div>
        )}

        <Button onClick={handleSubmitStockX} className="w-full h-12" disabled={isSubmitting || selectedSizes.size === 0}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <><Plus className="h-4 w-4 mr-2" />Ajouter au stock ({Array.from(selectedSizes.values()).reduce((sum, v) => sum + v.quantity, 0)} article{Array.from(selectedSizes.values()).reduce((sum, v) => sum + v.quantity, 0) > 1 ? "s" : ""})</>
          )}
        </Button>

        {addSupplierDialog}
      </div>
    );
  }

  // ─── Render: Manual Mode ────────────────────────────────────────

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => setStep("search")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>
      <h2 className="text-base font-semibold">Ajout manuel</h2>

      <div className="space-y-1.5">
        {manualImageUrl ? (
          <div className="relative rounded-xl overflow-hidden bg-secondary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={manualImageUrl} alt="Produit" className="w-full h-40 object-contain bg-white/5" />
            <button
              type="button"
              onClick={() => setManualImageUrl(null)}
              className="absolute top-2 right-2 p-1 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="cursor-pointer block">
              <div className="rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors p-6 text-center">
                {manualUploading ? <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /> : (
                  <><Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Ajouter une photo</p></>
                )}
              </div>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleManualImageUpload} disabled={manualUploading} />
            </label>
            <div className="flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <Input
                placeholder="Ou coller une URL d'image..."
                className="h-8 text-xs"
                onBlur={(e) => {
                  const url = e.target.value.trim();
                  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
                    setManualImageUrl(url);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const url = (e.target as HTMLInputElement).value.trim();
                    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
                      setManualImageUrl(url);
                    }
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="manual-name">Nom du produit *</Label>
        <Input id="manual-name" placeholder="Pokemon Booster Box..." value={manualName} onChange={(e) => setManualName(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Categorie *</Label>
        <Select value={manualCategory} onValueChange={setManualCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="manual-size">Taille / Variante</Label>
          <Input id="manual-size" placeholder="42, XL, OS..." value={manualSize} onChange={(e) => setManualSize(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manual-price">Prix d&apos;achat * (EUR)</Label>
          <Input id="manual-price" type="number" step="0.01" min="0" placeholder="120.00" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Quantite</Label>
        <div className="flex items-center gap-2 w-32">
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setManualQuantity(Math.max(1, manualQuantity - 1))}><Minus className="h-3 w-3" /></Button>
          <Input type="number" min="1" value={manualQuantity} onChange={(e) => setManualQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="h-9 text-center" />
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setManualQuantity(manualQuantity + 1)}><Plus className="h-3 w-3" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 min-w-0 overflow-hidden">
          <Label>Date d&apos;achat *</Label>
          <Input type="date" value={globalPurchaseDate} onChange={(e) => handlePurchaseDateChange(e.target.value)} className="w-full" />
        </div>
        <div className="space-y-1.5 min-w-0">
          <Label>Prix cible</Label>
          <Input type="number" step="0.01" min="0" placeholder="180.00" value={globalTargetPrice} onChange={(e) => setGlobalTargetPrice(e.target.value)} className="w-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 min-w-0">
          <Label>Stockage</Label>
          <Select value={globalStorageLocation} onValueChange={setGlobalStorageLocation}>
            <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
            <SelectContent>{STORAGE_LOCATIONS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 min-w-0 overflow-hidden">
          <Label>Date retour</Label>
          <ReturnDeadlinePicker value={globalReturnDeadline} onChange={handleReturnDeadlineChange} baseDate={globalPurchaseDate} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Fournisseur</Label>
        <div className="space-y-1.5">
          <Select value={selectedSupplierId} onValueChange={handleSupplierChange}>
            <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
            <SelectContent>
              {localSuppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}{s.returnDays ? ` (${s.returnDays}j)` : ""}</SelectItem>
              ))}
              <SelectItem value="__other__">Autre</SelectItem>
              <SelectItem value="__add_new__">+ Nouveau fournisseur</SelectItem>
            </SelectContent>
          </Select>
          {showCustomSupplier && (
            <Input placeholder="Nom du fournisseur..." value={globalSupplierName} onChange={(e) => setGlobalSupplierName(e.target.value)} />
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea placeholder="Notes supplementaires..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      <Button onClick={handleSubmitManual} className="w-full h-12" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <><Plus className="h-4 w-4 mr-2" />Ajouter au stock{manualQuantity > 1 ? ` (${manualQuantity} articles)` : ""}</>
        )}
      </Button>

      {addSupplierDialog}
    </div>
  );
}
