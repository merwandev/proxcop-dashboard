"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, PLATFORMS, STATUSES } from "@/lib/utils/constants";
import { Filter, X } from "lucide-react";
import { useState } from "react";

export function ProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const currentCategory = searchParams.get("category") ?? "";
  const currentPlatform = searchParams.get("platform") ?? "";
  const currentStatus = searchParams.get("status") ?? "";

  const hasFilters = currentCategory || currentPlatform || currentStatus;

  const applyFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/stock?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/stock");
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="h-3.5 w-3.5" />
          Filtres
          {hasFilters && (
            <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
              !
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Filtres</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Categorie</label>
            <Select
              value={currentCategory || "all"}
              onValueChange={(v) => applyFilter("category", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Platform */}
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Plateforme</label>
            <Select
              value={currentPlatform || "all"}
              onValueChange={(v) => applyFilter("platform", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Statut</label>
            <Select
              value={currentStatus || "all"}
              onValueChange={(v) => applyFilter("status", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous (hors vendu)</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear */}
          {hasFilters && (
            <Button variant="ghost" className="w-full gap-2" onClick={clearFilters}>
              <X className="h-4 w-4" />
              Effacer les filtres
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
