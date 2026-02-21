"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
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
import { PLATFORMS } from "@/lib/utils/constants";
import { createSale } from "@/lib/actions/sale-actions";
import { BadgeCheck, Loader2 } from "lucide-react";

interface SaleDialogProps {
  variantId: string;
}

export function SaleDialog({ variantId }: SaleDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const action = async (_prev: unknown, formData: FormData) => {
    formData.set("variantId", variantId);
    try {
      await createSale(formData);
      setOpen(false);
      router.refresh();
      return { success: true };
    } catch (e) {
      return { error: (e as Error).message };
    }
  };

  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="saleDate">Date de vente *</Label>
            <Input
              id="saleDate"
              name="saleDate"
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Plateforme</Label>
            <Select name="platform">
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
                defaultValue="0"
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
  );
}
