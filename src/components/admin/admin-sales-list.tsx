"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { adminDeleteSaleAction } from "@/lib/actions/admin-actions";
import { sendMessageAction } from "@/lib/actions/message-actions";
import { Loader2, Trash2, Mail, Package } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/format";

export interface AdminSaleItem {
  saleId: string;
  salePrice: string;
  saleDate: string;
  platform: string | null;
  purchasePrice: string;
  sizeVariant: string | null;
  productName: string;
  productSku: string | null;
  productImageUrl: string | null;
  userId: string;
  discordUsername: string;
  discordAvatar: string | null;
  discordId: string;
}

interface AdminSalesListProps {
  sales: AdminSaleItem[];
}

export function AdminSalesList({ sales }: AdminSalesListProps) {
  const [items, setItems] = useState(sales);
  const [sendTo, setSendTo] = useState<{ userId: string; username: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (saleId: string) => {
    startTransition(async () => {
      try {
        await adminDeleteSaleAction(saleId);
        setItems((prev) => prev.filter((s) => s.saleId !== saleId));
        setConfirmDelete(null);
        toast.success("Vente supprimee — variant remis en stock");
      } catch {
        toast.error("Erreur lors de la suppression");
      }
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-secondary p-8 text-center">
        <p className="text-sm text-muted-foreground">Aucune vente</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1.5">
        {items.map((sale) => {
          const profit = Number(sale.salePrice) - Number(sale.purchasePrice);
          const avatarUrl = sale.discordAvatar
            ? (sale.discordAvatar.startsWith("http") ? sale.discordAvatar : `https://cdn.discordapp.com/avatars/${sale.discordId}/${sale.discordAvatar}.png`)
            : null;

          return (
            <div
              key={sale.saleId}
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-card border border-border"
            >
              {/* Product image */}
              <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-white flex-shrink-0">
                {sale.productImageUrl ? (
                  <Image
                    src={sale.productImageUrl}
                    alt={sale.productName}
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

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-tight truncate">
                  {sale.productName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {/* User avatar + name */}
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="h-3.5 w-3.5 rounded-full" />
                  ) : null}
                  <span className="text-[10px] text-muted-foreground">{sale.discordUsername}</span>
                  {sale.sizeVariant && (
                    <span className="text-[9px] text-muted-foreground/60">· {sale.sizeVariant}</span>
                  )}
                </div>
              </div>

              {/* Price / Profit */}
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-semibold">{formatCurrency(Number(sale.salePrice))}</p>
                <p className={`text-[10px] ${profit >= 0 ? "text-success" : "text-danger"}`}>
                  {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSendTo({ userId: sale.userId, username: sale.discordUsername })}
                  className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"
                  title="Envoyer un message"
                >
                  <Mail className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(sale.saleId)}
                  className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-danger"
                  title="Supprimer la vente"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Send message dialog */}
      {sendTo && (
        <SendMessageDialog
          toUserId={sendTo.userId}
          toUsername={sendTo.username}
          onClose={() => setSendTo(null)}
        />
      )}

      {/* Confirm delete dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Supprimer cette vente ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            La vente sera supprimee et le variant sera remis en stock.
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(null)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              disabled={isPending}
              className="flex-1 gap-1"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Send Message Dialog ─────────────────────────────────────────────

function SendMessageDialog({
  toUserId,
  toUsername,
  onClose,
}: {
  toUserId: string;
  toUsername: string;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSend = () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Sujet et message requis");
      return;
    }

    startTransition(async () => {
      try {
        await sendMessageAction({
          toUserId,
          subject: subject.trim(),
          body: body.trim(),
        });
        toast.success(`Message envoye a ${toUsername}`);
        onClose();
      } catch (e) {
        toast.error((e as Error).message || "Erreur");
      }
    });
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Message a {toUsername}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Sujet</Label>
            <Input
              placeholder="Objet du message..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Message</Label>
            <Textarea
              placeholder="Votre message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="text-sm"
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={isPending || !subject.trim() || !body.trim()}
            className="w-full gap-1.5"
            size="sm"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Mail className="h-3.5 w-3.5" />
                Envoyer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
