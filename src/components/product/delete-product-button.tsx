"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteProduct } from "@/lib/actions/product-actions";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteProductButtonProps {
  productId: string;
}

export function DeleteProductButton({ productId }: DeleteProductButtonProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProduct(productId);
      toast.success("Produit supprime");
      router.push("/stock");
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleting(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-danger border-danger/30">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer ce produit ?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Cette action est irreversible. Le produit et ses donnees de vente seront supprimes.
        </p>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Supprimer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
