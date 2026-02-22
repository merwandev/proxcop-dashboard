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
  createExpenseAction,
  toggleExpenseAction,
  deleteExpenseAction,
} from "@/lib/actions/expense-actions";
import { Plus, Trash2, Wallet, RotateCcw, Receipt, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/format";

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: string;
  date: string;
  recurring: boolean;
  active: boolean;
  createdAt: Date;
}

interface ExpenseSettingsProps {
  expenses: Expense[];
}

const EXPENSE_CATEGORIES = [
  { value: "bot", label: "Bot" },
  { value: "proxy", label: "Proxy" },
  { value: "subscription", label: "Abonnement" },
  { value: "shipping_materials", label: "Materiel d'envoi" },
  { value: "other", label: "Autre" },
] as const;

const getCategoryLabel = (value: string) =>
  EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;

export function ExpenseSettings({ expenses: initialExpenses }: ExpenseSettingsProps) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [isPending, startTransition] = useTransition();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState<string>("other");
  const [newRecurring, setNewRecurring] = useState(true);
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);

  const recurringExpenses = expenses.filter((e) => e.recurring);
  const fixedExpenses = expenses.filter((e) => !e.recurring);
  const totalMonthly = recurringExpenses
    .filter((e) => e.active)
    .reduce((sum, e) => sum + Number(e.amount), 0);

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
        await createExpenseAction({
          category: newCategory as "bot" | "proxy" | "shipping_materials" | "subscription" | "other",
          description,
          amount: amount.toFixed(2),
          date: newDate,
          recurring: newRecurring,
        });
        // Optimistic update
        setExpenses((prev) => [
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
        setNewCategory("other");
        setNewRecurring(true);
        setNewDate(new Date().toISOString().split("T")[0]);
        setShowAddDialog(false);
        toast.success("Depense ajoutee");
      } catch {
        toast.error("Erreur lors de l'ajout");
      }
    });
  };

  const handleToggle = (expenseId: string, active: boolean) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === expenseId ? { ...e, active } : e))
    );

    startTransition(async () => {
      try {
        await toggleExpenseAction(expenseId, active);
      } catch {
        // Revert on error
        setExpenses((prev) =>
          prev.map((e) => (e.id === expenseId ? { ...e, active: !active } : e))
        );
        toast.error("Erreur lors de la modification");
      }
    });
  };

  const handleDelete = (expenseId: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    setShowDeleteConfirm(null);

    startTransition(async () => {
      try {
        await deleteExpenseAction(expenseId);
        toast.success("Depense supprimee");
      } catch {
        toast.error("Erreur lors de la suppression");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Depenses</h2>
          {totalMonthly > 0 && (
            <span className="text-[11px] text-muted-foreground">
              ({formatCurrency(totalMonthly)}/mois)
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </Button>
      </div>

      {expenses.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Aucune depense configuree.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Recurring (monthly) expenses */}
          {recurringExpenses.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-1">
                <RotateCcw className="h-3 w-3 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  Mensuel
                </p>
              </div>
              {recurringExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-card border border-border transition-opacity ${
                    !expense.active ? "opacity-50" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{expense.description}</p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {getCategoryLabel(expense.category)}
                      </span>
                    </div>
                    <p className="text-[11px] text-warning font-medium">
                      -{formatCurrency(Number(expense.amount))}/mois
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={expense.active}
                      onCheckedChange={(checked) => handleToggle(expense.id, checked)}
                      disabled={isPending}
                    />
                    <button
                      className="p-1 text-muted-foreground hover:text-danger transition-colors"
                      onClick={() => setShowDeleteConfirm(expense.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fixed (one-time) expenses */}
          {fixedExpenses.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-1">
                <Receipt className="h-3 w-3 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  Ponctuel
                </p>
              </div>
              {fixedExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-card border border-border"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{expense.description}</p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {getCategoryLabel(expense.category)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      -{formatCurrency(Number(expense.amount))} · {new Date(expense.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <button
                    className="p-1 text-muted-foreground hover:text-danger transition-colors flex-shrink-0"
                    onClick={() => handleDelete(expense.id)}
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

      {/* Add expense dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajouter une depense</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Input
                placeholder="CookGroup, Proxies, Scotch..."
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
                  placeholder="29.99"
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
                    {EXPENSE_CATEGORIES.map((c) => (
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
                <Label className="text-sm">Depense mensuelle</Label>
                <p className="text-[11px] text-muted-foreground">
                  {newRecurring ? "Sera comptee chaque mois" : "Comptee une seule fois"}
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

      {/* Delete confirmation dialog (for recurring expenses) */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Supprimer la depense ?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              La suppression retire cette depense de tous les calculs, y compris les mois precedents.
              Il est preferable de <strong>desactiver</strong> la depense pour que les benefices passes restent corrects.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (showDeleteConfirm) {
                    handleToggle(showDeleteConfirm, false);
                    setShowDeleteConfirm(null);
                    toast.success("Depense desactivee");
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
