"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { CATEGORIES, STORAGE_LOCATIONS } from "@/lib/utils/constants";
import { createProductWithVariants } from "@/lib/actions/product-actions";
import { getPresignedUploadUrl } from "@/lib/actions/upload-actions";
import { Loader2, Search, Plus, Minus, Package, Upload, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────

interface StockXVariant {
  variantId: string;
  sizeUS: string;
  sizeEU: string | null;
}

interface SelectedVariant {
  sizeUS: string;
  purchasePrice: string;
  quantity: number;
  storageLocation: string;
}

type WizardStep = "search" | "sizes" | "manual";

// ─── Component ──────────────────────────────────────────────────────

export function ProductForm() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("search");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search state
  const [skuInput, setSkuInput] = useState("");
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "found" | "not_found" | "error">("idle");
  const [productTitle, setProductTitle] = useState("");
  const [productSku, setProductSku] = useState("");
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  const [availableSizes, setAvailableSizes] = useState<StockXVariant[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Size selection state
  const [selectedSizes, setSelectedSizes] = useState<Map<string, SelectedVariant>>(new Map());
  const [globalPurchaseDate, setGlobalPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [globalTargetPrice, setGlobalTargetPrice] = useState("");
  const [globalReturnDeadline, setGlobalReturnDeadline] = useState("");
  const [globalStorageLocation, setGlobalStorageLocation] = useState("");
  const [notes, setNotes] = useState("");

  // Manual mode state
  const [manualName, setManualName] = useState("");
  const [manualCategory, setManualCategory] = useState<string>("sneakers");
  const [manualSize, setManualSize] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualQuantity, setManualQuantity] = useState(1);
  const [manualImageUrl, setManualImageUrl] = useState<string | null>(null);
  const [manualUploading, setManualUploading] = useState(false);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // ─── SKU Search ─────────────────────────────────────────────────

  const handleSkuSearch = useCallback(() => {
    const sku = skuInput.trim();
    if (sku.length < 3) return;

    setSearchStatus("loading");

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sku-lookup?sku=${encodeURIComponent(sku)}&mode=full`);
        const data = await res.json();

        if (data.status === "found" && data.variants?.length > 0) {
          setProductTitle(data.title || "");
          setProductSku(sku.toUpperCase());
          setProductImageUrl(data.imageUrl || null);
          setAvailableSizes(data.variants);
          setSearchStatus("found");
          setStep("sizes");
        } else if (data.status === "not_found") {
          setSearchStatus("not_found");
        } else {
          setSearchStatus("error");
        }
      } catch {
        setSearchStatus("error");
      }
    }, 300);
  }, [skuInput]);

  // ─── Size Selection ─────────────────────────────────────────────

  const toggleSize = useCallback((size: string) => {
    setSelectedSizes((prev) => {
      const next = new Map(prev);
      if (next.has(size)) {
        next.delete(size);
      } else {
        next.set(size, {
          sizeUS: size,
          purchasePrice: "",
          quantity: 1,
          storageLocation: "",
        });
      }
      return next;
    });
  }, []);

  const updateSizeField = useCallback((size: string, field: keyof SelectedVariant, value: string | number) => {
    setSelectedSizes((prev) => {
      const next = new Map(prev);
      const current = next.get(size);
      if (current) {
        next.set(size, { ...current, [field]: value });
      }
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
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 800,
        maxSizeMB: 0.2,
        useWebWorker: true,
      });

      const { uploadUrl, publicUrl } = await getPresignedUploadUrl(compressed.type);
      await fetch(uploadUrl, {
        method: "PUT",
        body: compressed,
        headers: { "Content-Type": compressed.type },
      });

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
    if (selectedSizes.size === 0) {
      toast.error("Selectionnez au moins une taille");
      return;
    }

    // Validate all prices are filled
    for (const [size, data] of selectedSizes) {
      if (!data.purchasePrice || Number(data.purchasePrice) <= 0) {
        toast.error(`Prix d'achat requis pour la taille ${size}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await createProductWithVariants({
        name: productTitle,
        sku: productSku,
        imageUrl: productImageUrl || undefined,
        category: "sneakers",
        purchaseDate: globalPurchaseDate,
        targetPrice: globalTargetPrice ? Number(globalTargetPrice) : undefined,
        returnDeadline: globalReturnDeadline || undefined,
        notes: notes || undefined,
        variants: Array.from(selectedSizes.values()).map((v) => ({
          sizeVariant: v.sizeUS,
          purchasePrice: Number(v.purchasePrice),
          quantity: v.quantity,
          storageLocation: v.storageLocation || globalStorageLocation || undefined,
        })),
      });

      toast.success("Produit ajoute au stock !");
      router.push("/stock");
    } catch (e) {
      toast.error((e as Error).message || "Erreur lors de l'ajout");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedSizes, productTitle, productSku, productImageUrl,
    globalPurchaseDate, globalTargetPrice, globalReturnDeadline,
    globalStorageLocation, notes, router,
  ]);

  const handleSubmitManual = useCallback(async () => {
    if (!manualName.trim()) {
      toast.error("Le nom du produit est requis");
      return;
    }
    if (!manualPrice || Number(manualPrice) <= 0) {
      toast.error("Le prix d'achat est requis");
      return;
    }

    setIsSubmitting(true);
    try {
      await createProductWithVariants({
        name: manualName.trim(),
        imageUrl: manualImageUrl || undefined,
        category: manualCategory as "sneakers" | "pokemon" | "lego" | "random",
        purchaseDate: globalPurchaseDate,
        targetPrice: globalTargetPrice ? Number(globalTargetPrice) : undefined,
        returnDeadline: globalReturnDeadline || undefined,
        notes: notes || undefined,
        variants: [{
          sizeVariant: manualSize || undefined,
          purchasePrice: Number(manualPrice),
          quantity: manualQuantity,
          storageLocation: globalStorageLocation || undefined,
        }],
      });

      toast.success("Produit ajoute au stock !");
      router.push("/stock");
    } catch (e) {
      toast.error((e as Error).message || "Erreur lors de l'ajout");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    manualName, manualCategory, manualSize, manualPrice, manualQuantity,
    manualImageUrl, globalPurchaseDate, globalTargetPrice,
    globalReturnDeadline, globalStorageLocation, notes, router,
  ]);

  // ─── Render: Search Step ────────────────────────────────────────

  if (step === "search") {
    return (
      <div className="space-y-6">
        {/* SKU Search */}
        <div className="space-y-3">
          <Label htmlFor="sku-search" className="text-base font-semibold">
            Rechercher par SKU
          </Label>
          <div className="flex gap-2">
            <Input
              id="sku-search"
              placeholder="DD1391-100"
              value={skuInput}
              onChange={(e) => {
                setSkuInput(e.target.value);
                setSearchStatus("idle");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSkuSearch();
                }
              }}
              className="font-mono"
            />
            <Button
              onClick={handleSkuSearch}
              disabled={skuInput.trim().length < 3 || searchStatus === "loading"}
              size="icon"
              className="shrink-0"
            >
              {searchStatus === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Entrez le SKU pour trouver automatiquement le produit et ses tailles
          </p>
        </div>

        {/* Search Status Messages */}
        {searchStatus === "not_found" && (
          <div className="rounded-xl bg-secondary p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Produit non trouve sur StockX pour le SKU &quot;{skuInput.toUpperCase()}&quot;
            </p>
          </div>
        )}

        {searchStatus === "error" && (
          <div className="rounded-xl bg-secondary p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Service StockX temporairement indisponible. Reessayez ou ajoutez manuellement.
            </p>
          </div>
        )}

        {/* Manual Add Button */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-3 text-muted-foreground">ou</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full h-12"
          onClick={() => setStep("manual")}
        >
          <Package className="h-4 w-4 mr-2" />
          Ajouter manuellement
        </Button>
      </div>
    );
  }

  // ─── Render: Size Selection Step ────────────────────────────────

  if (step === "sizes") {
    return (
      <div className="space-y-5">
        {/* Back button + Product info */}
        <button
          type="button"
          onClick={() => {
            setStep("search");
            setSearchStatus("idle");
            setSelectedSizes(new Map());
          }}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        {/* Product preview card */}
        <div className="rounded-xl bg-secondary p-4 flex gap-4">
          {productImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={productImageUrl}
              alt={productTitle}
              className="w-16 h-16 object-contain rounded-lg bg-white/5 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{productTitle}</p>
            <p className="text-xs text-muted-foreground font-mono">{productSku}</p>
          </div>
        </div>

        {/* Size Grid */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            Selectionnez les tailles ({selectedSizes.size} selectionnee{selectedSizes.size > 1 ? "s" : ""})
          </Label>
          <div className="grid grid-cols-4 gap-1.5">
            {availableSizes.map((v) => {
              const isSelected = selectedSizes.has(v.sizeUS);
              return (
                <button
                  key={v.variantId}
                  type="button"
                  onClick={() => toggleSize(v.sizeUS)}
                  className={cn(
                    "py-2 px-1 rounded-lg font-medium transition-all min-h-[44px] flex flex-col items-center justify-center gap-0.5",
                    isSelected
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
                      : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
                  )}
                >
                  <span className="text-xs">US {v.sizeUS}</span>
                  {v.sizeEU && (
                    <span className={cn(
                      "text-[9px]",
                      isSelected ? "text-primary-foreground/70" : "text-muted-foreground/60"
                    )}>
                      EU {v.sizeEU}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected sizes with price inputs */}
        {selectedSizes.size > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Prix par taille</Label>
            {Array.from(selectedSizes.entries()).map(([size, data]) => (
              <div key={size} className="rounded-xl bg-secondary p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Taille {size}</span>
                  <button
                    type="button"
                    onClick={() => toggleSize(size)}
                    className="text-xs text-muted-foreground hover:text-danger transition-colors"
                  >
                    Retirer
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Prix d&apos;achat *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="120.00"
                      value={data.purchasePrice}
                      onChange={(e) => updateSizeField(size, "purchasePrice", e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Quantite</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => updateSizeField(size, "quantity", Math.max(1, data.quantity - 1))}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        value={data.quantity}
                        onChange={(e) => updateSizeField(size, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-9 text-sm text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => updateSizeField(size, "quantity", data.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Global fields */}
        <div className="space-y-3 pt-2 border-t border-border">
          <Label className="text-sm font-semibold">Infos globales</Label>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Date d&apos;achat *</Label>
              <Input
                type="date"
                value={globalPurchaseDate}
                onChange={(e) => setGlobalPurchaseDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Prix cible</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="180.00"
                value={globalTargetPrice}
                onChange={(e) => setGlobalTargetPrice(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Stockage</Label>
              <Select value={globalStorageLocation} onValueChange={setGlobalStorageLocation}>
                <SelectTrigger className="h-9 text-sm">
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
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Date retour</Label>
              <Input
                type="date"
                value={globalReturnDeadline}
                onChange={(e) => setGlobalReturnDeadline(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Notes</Label>
            <Textarea
              placeholder="Notes supplementaires..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmitStockX}
          className="w-full h-12"
          disabled={isSubmitting || selectedSizes.size === 0}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter au stock ({Array.from(selectedSizes.values()).reduce((sum, v) => sum + v.quantity, 0)} article{Array.from(selectedSizes.values()).reduce((sum, v) => sum + v.quantity, 0) > 1 ? "s" : ""})
            </>
          )}
        </Button>
      </div>
    );
  }

  // ─── Render: Manual Mode ────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        type="button"
        onClick={() => setStep("search")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      <h2 className="text-base font-semibold">Ajout manuel</h2>

      {/* Image upload */}
      <div className="space-y-1.5">
        {manualImageUrl ? (
          <div className="relative rounded-xl overflow-hidden bg-secondary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={manualImageUrl}
              alt="Produit"
              className="w-full h-40 object-contain bg-white/5"
            />
          </div>
        ) : (
          <label className="cursor-pointer block">
            <div className="rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors p-6 text-center">
              {manualUploading ? (
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              ) : (
                <>
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Ajouter une photo</p>
                </>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleManualImageUpload}
              disabled={manualUploading}
            />
          </label>
        )}
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="manual-name">Nom du produit *</Label>
        <Input
          id="manual-name"
          placeholder="Pokemon Booster Box..."
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
        />
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label>Categorie *</Label>
        <Select value={manualCategory} onValueChange={setManualCategory}>
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

      {/* Size + Price */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="manual-size">Taille / Variante</Label>
          <Input
            id="manual-size"
            placeholder="42, XL, OS..."
            value={manualSize}
            onChange={(e) => setManualSize(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manual-price">Prix d&apos;achat * (EUR)</Label>
          <Input
            id="manual-price"
            type="number"
            step="0.01"
            min="0"
            placeholder="120.00"
            value={manualPrice}
            onChange={(e) => setManualPrice(e.target.value)}
          />
        </div>
      </div>

      {/* Quantity */}
      <div className="space-y-1.5">
        <Label>Quantite</Label>
        <div className="flex items-center gap-2 w-32">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setManualQuantity(Math.max(1, manualQuantity - 1))}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            min="1"
            value={manualQuantity}
            onChange={(e) => setManualQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="h-9 text-center"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setManualQuantity(manualQuantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Global fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Date d&apos;achat *</Label>
          <Input
            type="date"
            value={globalPurchaseDate}
            onChange={(e) => setGlobalPurchaseDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Prix cible</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="180.00"
            value={globalTargetPrice}
            onChange={(e) => setGlobalTargetPrice(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Stockage</Label>
          <Select value={globalStorageLocation} onValueChange={setGlobalStorageLocation}>
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
        <div className="space-y-1.5">
          <Label>Date retour</Label>
          <Input
            type="date"
            value={globalReturnDeadline}
            onChange={(e) => setGlobalReturnDeadline(e.target.value)}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea
          placeholder="Notes supplementaires..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmitManual}
        className="w-full h-12"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter au stock{manualQuantity > 1 ? ` (${manualQuantity} articles)` : ""}
          </>
        )}
      </Button>
    </div>
  );
}
