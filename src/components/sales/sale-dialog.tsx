"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS, PAYMENT_METHODS } from "@/lib/utils/constants";
import { createSale } from "@/lib/actions/sale-actions";
import { BadgeCheck, Loader2, EyeOff } from "lucide-react";
import { type SaleSuccessData } from "./sale-success-animation";

interface SaleDialogProps {
  variantId: string;
  productInfo?: {
    name: string;
    imageUrl: string | null;
    sku: string | null;
    sizeVariant: string | null;
    purchasePrice: number;
  };
  platformFees?: Record<string, number>;
  userName?: string;
  showSuccessAnimation?: boolean;
  onSaleSuccess?: (data: SaleSuccessData) => void;
}

export function SaleDialog({ variantId, productInfo, platformFees, userName, showSuccessAnimation = true, onSaleSuccess }: SaleDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [platformFeeValue, setPlatformFeeValue] = useState("0");
  const [anonymousSale, setAnonymousSale] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("platform_default");

  // Auto-calculate commission when platform or sale price changes
  const autoCalculateFee = (platform: string, price: string) => {
    const feePercent = platformFees?.[platform];
    const priceNum = parseFloat(price);
    if (feePercent && priceNum > 0) {
      const fee = Math.round(priceNum * feePercent) / 100;
      setPlatformFeeValue(fee.toFixed(2));
    } else if (!feePercent) {
      setPlatformFeeValue("0");
    }
  };

  const handlePlatformChange = (platform: string) => {
    setSelectedPlatform(platform);
    autoCalculateFee(platform, salePrice);
  };

  const handleSalePriceChange = (price: string) => {
    setSalePrice(price);
    if (selectedPlatform) {
      autoCalculateFee(selectedPlatform, price);
    }
  };

  const action = async (_prev: unknown, formData: FormData) => {
    formData.set("variantId", variantId);
    try {
      await createSale(formData);

      // Build success data from form values + product info
      if (showSuccessAnimation && productInfo && onSaleSuccess) {
        const salePrice = Number(formData.get("salePrice")) || 0;
        const platformFee = Number(formData.get("platformFee")) || 0;
        const shippingCost = Number(formData.get("shippingCost")) || 0;
        const otherFees = Number(formData.get("otherFees")) || 0;
        const platform = (formData.get("platform") as string) || null;
        const saleDate = (formData.get("saleDate") as string) || new Date().toISOString().split("T")[0];

        onSaleSuccess({
          salePrice,
          purchasePrice: productInfo.purchasePrice,
          platformFee,
          shippingCost,
          otherFees,
          platform,
          saleDate,
          productName: productInfo.name,
          productImage: productInfo.imageUrl,
          productSku: productInfo.sku,
          sizeVariant: productInfo.sizeVariant,
          userName,
        });
      }

      setOpen(false);
      setSelectedPlatform("");
      setSalePrice("");
      setPlatformFeeValue("0");
      setAnonymousSale(false);
      setPaymentMethod("platform_default");
      return { success: true };
    } catch (e) {
      return { error: (e as Error).message };
    }
  };

  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelectedPlatform(""); setSalePrice(""); setPlatformFeeValue("0"); setAnonymousSale(false); setPaymentMethod("platform_default"); } }}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-success">
            <BadgeCheck className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer la vente</DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="variantId" value={variantId} />

            <div className="space-y-1.5">
              <Label htmlFor="salePrice">Prix de vente (EUR) *</Label>
              <Input
                id="salePrice"
                name="salePrice"
                type="number"
                step="0.01"
                min="0"
                required
                value={salePrice}
                onChange={(e) => handleSalePriceChange(e.target.value)}
              />
            </div>

            {/* Sale date is automatic (today) */}
            <input type="hidden" name="saleDate" value={new Date().toISOString().split("T")[0]} />

            <div className="space-y-1.5">
              <Label>Plateforme</Label>
              <Select
                value={selectedPlatform}
                onValueChange={handlePlatformChange}
              >
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
              <input type="hidden" name="platform" value={selectedPlatform} />
            </div>

            {/* Discord-specific fields */}
            {selectedPlatform === "discord" && (
              <div className="space-y-3 rounded-lg border border-[#5865F2]/30 bg-[#5865F2]/5 p-3">
                <div className="space-y-1.5">
                  <Label htmlFor="buyerUsername">Acheteur Discord</Label>
                  <Input
                    id="buyerUsername"
                    name="buyerUsername"
                    placeholder="@username"
                    className="bg-card"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Statut du paiement</Label>
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
              <Label>Moyen de paiement</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
              <input type="hidden" name="paymentMethod" value={paymentMethod} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="platformFee">Commission</Label>
                <Input
                  id="platformFee"
                  name="platformFee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={platformFeeValue}
                  onChange={(e) => setPlatformFeeValue(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shippingCost">Envoi</Label>
                <Input
                  id="shippingCost"
                  name="shippingCost"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="otherFees">Autres</Label>
                <Input
                  id="otherFees"
                  name="otherFees"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={2} />
            </div>

            {/* Anonymous sale toggle */}
            <input type="hidden" name="anonymousSale" value={anonymousSale ? "true" : "false"} />
            <button
              type="button"
              onClick={() => setAnonymousSale(!anonymousSale)}
              className={`flex items-center gap-2 w-full rounded-lg border p-3 text-sm transition-colors ${
                anonymousSale
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-border bg-secondary/50 text-muted-foreground"
              }`}
            >
              <EyeOff className="h-4 w-4 shrink-0" />
              <div className="text-left">
                <p className="font-medium">Vente anonyme</p>
                <p className="text-xs opacity-70">Masquer les détails dans le webhook Discord</p>
              </div>
              <div className={`ml-auto h-5 w-9 rounded-full transition-colors ${anonymousSale ? "bg-primary" : "bg-muted-foreground/30"}`}>
                <div className={`h-4 w-4 rounded-full bg-white mt-0.5 transition-transform ${anonymousSale ? "translate-x-4.5" : "translate-x-0.5"}`} />
              </div>
            </button>

            {state && "error" in state && (
              <p className="text-sm text-danger">{state.error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirmer la vente"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
