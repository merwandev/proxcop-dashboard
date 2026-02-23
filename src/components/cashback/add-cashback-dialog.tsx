"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createCashback } from "@/lib/actions/cashback-actions";
import { CASHBACK_APPS } from "@/lib/utils/constants";
import { Loader2, Plus, Package, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VariantOption {
  variantId: string;
  productName: string;
  productImage: string | null;
  productSku: string | null;
  sizeVariant: string | null;
  purchasePrice: string;
}

interface AddCashbackDialogProps {
  open: boolean;
  onClose: () => void;
  variants: VariantOption[];
  onCreated: () => void;
}

export function AddCashbackDialog({ open, onClose, variants, onCreated }: AddCashbackDialogProps) {
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("igraal");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = search.trim()
    ? variants.filter((v) => {
        const q = search.toLowerCase();
        return (
          v.productName.toLowerCase().includes(q) ||
          v.productSku?.toLowerCase().includes(q) ||
          v.sizeVariant?.toLowerCase().includes(q)
        );
      })
    : variants;

  const selectedVariant = variants.find((v) => v.variantId === selectedVariantId);

  const handleCreate = () => {
    if (!selectedVariantId) {
      toast.error("Selectionnez un produit");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Pourcentage requis");
      return;
    }
    if (!selectedVariant) return;

    const percentage = Number(amount);
    const purchasePrice = Number(selectedVariant.purchasePrice);
    const eurAmount = purchasePrice * percentage / 100;

    startTransition(async () => {
      try {
        await createCashback({
          variantId: selectedVariantId,
          amount: eurAmount,
          source,
          status: "to_request",
        });
        toast.success("Cashback ajoute");
        onCreated();
        // Reset
        setSelectedVariantId("");
        setAmount("");
        setSource("igraal");
        setSearch("");
        onClose();
      } catch (e) {
        toast.error((e as Error).message || "Erreur");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-sm max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ajouter un cashback</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 overflow-y-auto flex-1">
          {/* Selected product preview */}
          {selectedVariant ? (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-white flex-shrink-0">
                {selectedVariant.productImage ? (
                  <Image
                    src={selectedVariant.productImage}
                    alt={selectedVariant.productName}
                    fill
                    className="object-contain p-0.5"
                    sizes="40px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{selectedVariant.productName}</p>
                <p className="text-[10px] text-muted-foreground">
                  {selectedVariant.sizeVariant && `${selectedVariant.sizeVariant} — `}
                  {selectedVariant.productSku || ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVariantId("")}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Changer
              </button>
            </div>
          ) : (
            <>
              {/* Search + variant picker */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Produit *</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un produit..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 text-sm pl-8"
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filtered.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {variants.length === 0
                      ? "Tous vos produits ont deja un cashback"
                      : "Aucun produit trouve"}
                  </p>
                ) : (
                  filtered.map((v) => (
                    <button
                      key={v.variantId}
                      type="button"
                      onClick={() => setSelectedVariantId(v.variantId)}
                      className={cn(
                        "w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors",
                        "bg-secondary/50 hover:bg-secondary"
                      )}
                    >
                      <div className="relative h-9 w-9 rounded overflow-hidden bg-white flex-shrink-0">
                        {v.productImage ? (
                          <Image
                            src={v.productImage}
                            alt={v.productName}
                            fill
                            className="object-contain p-0.5"
                            sizes="36px"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{v.productName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {v.sizeVariant && `${v.sizeVariant}`}
                          {v.productSku && <span className="font-mono ml-1">{v.productSku}</span>}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          {/* Percentage + App */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Cashback (%) *</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="5"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-9 text-sm pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              {selectedVariant && amount && Number(amount) > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  = {(Number(selectedVariant.purchasePrice) * Number(amount) / 100).toFixed(2)} EUR
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Appli</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CASHBACK_APPS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={isPending || !selectedVariantId || !amount}
            className="w-full gap-1.5"
            size="sm"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
