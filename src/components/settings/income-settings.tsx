"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createIncomeAction,
  toggleIncomeAction,
  deleteIncomeAction,
} from "@/lib/actions/income-actions";
import { Plus, Trash2, TrendingUp, RotateCcw, Receipt, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/format";

interface Income {
  id: string;
  category: string;
  description: string;
  amount: string;
  date: string;
  recurring: boolean;
  active: boolean;
  createdAt: Date;
}

interface IncomeSettingsProps {
  incomes: Income[];
}

const INCOME_CATEGORIES = [
  { value: "parrainage", label: "Parrainage" },
  { value: "salaire", label: "Salaire" },
  { value: "commission", label: "Commission" },
  { value: "autre", label: "Autre" },
] as const;

const getCategoryLabel = (value: string) =>
  INCOME_CATEGORIES.find((c) => c.value === value)?.label ?? value;

export function IncomeSettings({ incomes: initialIncomes }: IncomeSettingsProps) {
  const [incomes, setIncomes] = useState(initialIncomes);
  const [isPending, startTransition] = useTransition();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState<string>("autre");
  const [newRecurring, setNewRecurring] = useState(true);
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);

  const recurringIncomes = incomes.filter((i) => i.recurring);
  const fixedIncomes = incomes.filter((i) => !i.recurring);
  const totalMonthly = recurringIncomes
    .filter((i) => i.active)
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const handleAdd = () => {
    const description = newDescription.trim();
    if (!description) {
      toast.error("La description est requise");
      return;
    }
    const amount = parseFloat(newAmount);
    if (!amount || amount <= 0) {
      toast.error("Le montant doit etre positif");
      return;
    }

    startTransition(async () => {
      try {
        await createIncomeAction({
          category: newCategory as "parrainage" | "salaire" | "commission" | "autre",
          description,
          amount: amount.toFixed(2),
          date: newDate,
          recurring: newRecurring,
        });
        setIncomes((prev) => [
          {
            id: crypto.randomUUID(),
            category: newCategory,
            description,
            amount: amount.toFixed(2),
            date: newDate,
            recurring: newRecurring,
            active: true,
            createdAt: new Date(),
          },
          ...prev,
        ]);
        setNewDescription("");
        setNewAmount("");
        setNewCategory("autre");
        setNewRecurring(true);
        setNewDate(new Date().toISOString().split("T")[0]);
        setShowAddDialog(false);
        toast.success("Revenu ajoute");
      } catch {
        toast.error("Erreur lors de l'ajout");
      }
    });
  };

  const handleToggle = (incomeId: string, active: boolean) => {
    setIncomes((prev) =>
      prev.map((i) => (i.id === incomeId ? { ...i, active } : i))
    );

    startTransition(async () => {
      try {
        await toggleIncomeAction(incomeId, active);
      } catch {
        setIncomes((prev) =>
          prev.map((i) => (i.id === incomeId ? { ...i, active: !active } : i))
        );
        toast.error("Erreur lors de la modification");
      }
    });
  };

  const handleDelete = (incomeId: string) => {
    setIncomes((prev) => prev.filter((i) => i.id !== incomeId));
    setShowDeleteConfirm(null);

    startTransition(async () => {
      try {
        await deleteIncomeAction(incomeId);
        toast.success("Revenu supprime");
      } catch {
        toast.error("Erreur lors de la suppression");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Revenus</h2>
          {totalMonthly > 0 && (
            <span className="text-[11px] text-muted-foreground">
              ({formatCurrency(totalMonthly)}/mois)
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 hover:bg-primary hover:text-primary-foreground"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </Button>
      </div>

      {incomes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Aucun revenu configure.
        </p>
      ) : (
        <div className="space-y-4">
          {recurringIncomes.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-1">
                <RotateCcw className="h-3 w-3 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  Mensuel
                </p>
              </div>
              {recurringIncomes.map((income) => (
                <div
                  key={income.id}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-card border border-border transition-opacity ${
                    !income.active ? "opacity-50" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{income.description}</p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {getCategoryLabel(income.category)}
                      </span>
                    </div>
                    <p className="text-[11px] text-success font-medium">
                      +{formatCurrency(Number(income.amount))}/mois
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={income.active}
                      onCheckedChange={(checked) => handleToggle(income.id, checked)}
                      disabled={isPending}
                    />
                    <button
                      className="p-1 text-muted-foreground hover:text-danger transition-colors"
                      onClick={() => setShowDeleteConfirm(income.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {fixedIncomes.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-1">
                <Receipt className="h-3 w-3 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  Ponctuel
                </p>
              </div>
              {fixedIncomes.map((income) => (
                <div
                  key={income.id}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-card border border-border"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{income.description}</p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {getCategoryLabel(income.category)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      +{formatCurrency(Number(income.amount))} · {new Date(income.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <button
                    className="p-1 text-muted-foreground hover:text-danger transition-colors flex-shrink-0"
                    onClick={() => handleDelete(income.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajouter un revenu</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Input
                placeholder="Parrainage iGraal, Salaire..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="h-9 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Montant (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="50.00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Categorie</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOME_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <Label className="text-sm">Revenu mensuel</Label>
                <p className="text-[11px] text-muted-foreground">
                  {newRecurring ? "Sera compte chaque mois" : "Compte une seule fois"}
                </p>
              </div>
              <Switch
                checked={newRecurring}
                onCheckedChange={setNewRecurring}
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={isPending || !newDescription.trim() || !newAmount}
              className="w-full h-10"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Ajouter
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Supprimer le revenu ?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              La suppression retire ce revenu de tous les calculs, y compris les mois precedents.
              Il est preferable de <strong>desactiver</strong> le revenu pour que les benefices passes restent corrects.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (showDeleteConfirm) {
                    handleToggle(showDeleteConfirm, false);
                    setShowDeleteConfirm(null);
                    toast.success("Revenu desactive");
                  }
                }}
              >
                Desactiver
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  if (showDeleteConfirm) handleDelete(showDeleteConfirm);
                }}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
