"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { CASHBACK_STATUSES, CASHBACK_APPS } from "@/lib/utils/constants";
import { createCashback, updateCashback, deleteCashback } from "@/lib/actions/cashback-actions";
import { formatCurrency } from "@/lib/utils/format";
import { Coins, Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface CashbackItem {
  id: string;
  amount: string;
  source: string;
  status: string;
  requestedAt: Date;
  receivedAt: Date | null;
}

interface CashbackDialogProps {
  variantId: string;
  purchasePrice: number;
  cashbacks: CashbackItem[];
}

export function CashbackSection({ variantId, purchasePrice, cashbacks }: CashbackDialogProps) {
  return (
    <div className="space-y-1.5">
      {/* Summary line */}
      {cashbacks.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {cashbacks.map((cb) => {
            const statusInfo = CASHBACK_STATUSES.find((s) => s.value === cb.status);
            return (
              <Badge
                key={cb.id}
                variant="secondary"
                className={cn(
                  "text-[9px] h-4 px-1.5 gap-1",
                  cb.status === "received"
                    ? "bg-success/15 text-success"
                    : cb.status === "approved"
                      ? "bg-blue-500/15 text-blue-400"
                      : cb.status === "requested"
                        ? "bg-orange-400/15 text-orange-400"
                        : "bg-muted-foreground/15 text-muted-foreground"
                )}
              >
                <Coins className="h-2.5 w-2.5" />
                {formatCurrency(Number(cb.amount))} — {cb.source} ({statusInfo?.label})
              </Badge>
            );
          })}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1.5">
        <AddCashbackDialog variantId={variantId} purchasePrice={purchasePrice} />
        {cashbacks.map((cb) => (
          <EditCashbackDialog key={cb.id} cashback={cb} purchasePrice={purchasePrice} />
        ))}
      </div>
    </div>
  );
}

// Compact cashback indicator for the variant card
export function CashbackIndicator({ cashbacks }: { cashbacks: CashbackItem[] }) {
  if (cashbacks.length === 0) return null;

  const totalReceived = cashbacks
    .filter((c) => c.status === "received")
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const hasPending = cashbacks.some((c) => c.status !== "received");

  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-xs",
        totalReceived > 0 ? "text-success" : hasPending ? "text-orange-400" : "text-muted-foreground"
      )}
    >
      <Coins className="h-3 w-3" />
      {totalReceived > 0 ? `+${formatCurrency(totalReceived)}` : `${formatCurrency(cashbacks.reduce((s, c) => s + Number(c.amount), 0))}...`}
    </span>
  );
}

// --- Add Cashback Dialog ---

function AddCashbackDialog({ variantId, purchasePrice }: { variantId: string; purchasePrice: number }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("to_request");
  const [percentage, setPercentage] = useState("");
  const router = useRouter();

  const eurAmount = percentage && Number(percentage) > 0
    ? purchasePrice * Number(percentage) / 100
    : 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!percentage || Number(percentage) <= 0) {
        toast.error("Pourcentage invalide");
        setSaving(false);
        return;
      }
      await createCashback({
        variantId,
        amount: eurAmount,
        source: source || "other",
        status,
      });
      toast.success("Cashback ajoute");
      setOpen(false);
      setSource("");
      setStatus("to_request");
      setPercentage("");
      router.refresh();
    } catch {
      toast.error("Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px] px-2 text-muted-foreground hover:text-foreground">
          <Plus className="h-3 w-3" />
          Cashback
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un cashback</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cb-pct">Cashback (%) *</Label>
            <div className="relative">
              <Input
                id="cb-pct"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="pr-8"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
            {eurAmount > 0 && (
              <p className="text-[11px] text-muted-foreground">
                = {eurAmount.toFixed(2)} EUR (sur {formatCurrency(purchasePrice)})
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Application</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                {CASHBACK_APPS.map((app) => (
                  <SelectItem key={app.value} value={app.value}>
                    {app.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Statut</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CASHBACK_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Edit Cashback Dialog ---

function EditCashbackDialog({ cashback, purchasePrice }: { cashback: CashbackItem; purchasePrice: number }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [source, setSource] = useState(cashback.source);
  const [status, setStatus] = useState(cashback.status);
  // Back-calculate % from existing EUR amount
  const initialPct = purchasePrice > 0
    ? ((Number(cashback.amount) / purchasePrice) * 100).toFixed(1)
    : "";
  const [percentage, setPercentage] = useState(initialPct);
  const router = useRouter();

  const eurAmount = percentage && Number(percentage) > 0
    ? purchasePrice * Number(percentage) / 100
    : 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateCashback(cashback.id, {
        amount: eurAmount,
        source,
        status,
      });
      toast.success("Cashback modifie");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCashback(cashback.id);
      toast.success("Cashback supprime");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Erreur");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground">
          <Pencil className="h-2.5 w-2.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le cashback</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ecb-pct">Cashback (%) *</Label>
            <div className="relative">
              <Input
                id="ecb-pct"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="pr-8"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
            {eurAmount > 0 && (
              <p className="text-[11px] text-muted-foreground">
                = {eurAmount.toFixed(2)} EUR (sur {formatCurrency(purchasePrice)})
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Application</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                {CASHBACK_APPS.map((app) => (
                  <SelectItem key={app.value} value={app.value}>
                    {app.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Statut</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CASHBACK_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-1"
              onClick={handleDelete}
              disabled={deleting || saving}
            >
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Supprimer
            </Button>
            <Button type="submit" className="flex-1" disabled={saving || deleting}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
