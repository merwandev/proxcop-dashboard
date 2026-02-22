"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createSupplierAction,
  deleteSupplierAction,
} from "@/lib/actions/supplier-actions";
import { Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
  returnDays: string | null;
  createdAt: Date;
}

interface SupplierSettingsProps {
  suppliers: Supplier[];
}

const RETURN_OPTIONS = [
  { value: "none", label: "Aucun" },
  { value: "14", label: "14 jours" },
  { value: "30", label: "30 jours" },
  { value: "custom", label: "Personnalise" },
];

export function SupplierSettings({ suppliers: initialSuppliers }: SupplierSettingsProps) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [newReturnDays, setNewReturnDays] = useState("none");
  const [customDays, setCustomDays] = useState("");

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Le nom du fournisseur est requis");
      return;
    }

    let returnDays: string | null = null;
    if (newReturnDays === "custom") {
      const days = parseInt(customDays);
      if (!days || days <= 0) {
        toast.error("Nombre de jours invalide");
        return;
      }
      returnDays = String(days);
    } else if (newReturnDays !== "none") {
      returnDays = newReturnDays;
    }

    startTransition(async () => {
      try {
        const supplier = await createSupplierAction({ name, returnDays });
        setSuppliers((prev) => [...prev, supplier].sort((a, b) => a.name.localeCompare(b.name)));
        setNewName("");
        setNewReturnDays("none");
        setCustomDays("");
        toast.success("Fournisseur ajoute");
      } catch {
        toast.error("Erreur lors de l'ajout");
      }
    });
  };

  const handleDelete = (supplierId: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== supplierId));

    startTransition(async () => {
      try {
        await deleteSupplierAction(supplierId);
        toast.success("Fournisseur supprime");
      } catch {
        toast.error("Erreur lors de la suppression");
      }
    });
  };

  const formatReturnDays = (days: string | null) => {
    if (!days) return "Aucun retour";
    return `${days}j de retour`;
  };

  return (
    <Card className="p-4 bg-card border-border space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Fournisseurs</h2>
      </div>

      {/* Supplier list */}
      {suppliers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun fournisseur configure. Ajoutez-en un ci-dessous.
        </p>
      ) : (
        <div className="space-y-2">
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="flex items-center justify-between gap-2 p-3 rounded-lg bg-secondary/50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{supplier.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatReturnDays(supplier.returnDays)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-danger flex-shrink-0"
                onClick={() => handleDelete(supplier.id)}
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new supplier */}
      <div className="border-t border-border pt-4 space-y-3">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          Ajouter un fournisseur
        </Label>
        <div className="space-y-2">
          <Input
            placeholder="Nom du fournisseur..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-9 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <Select value={newReturnDays} onValueChange={setNewReturnDays}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Delai retour" />
              </SelectTrigger>
              <SelectContent>
                {RETURN_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {newReturnDays === "custom" && (
              <Input
                type="number"
                min="1"
                placeholder="Nb jours"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className="h-9 text-sm"
              />
            )}
          </div>
        </div>
        <Button
          onClick={handleAdd}
          disabled={isPending || !newName.trim()}
          className="w-full h-9 text-sm"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Ajouter
        </Button>
      </div>
    </Card>
  );
}
