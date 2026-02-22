"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CalendarRange } from "lucide-react";

const PERIODS = [
  { value: "30j", label: "30j" },
  { value: "ytd", label: "YTD" },
  { value: "custom", label: "Personnalisé" },
] as const;

export function PeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPeriod = searchParams.get("period") ?? "30j";

  const [customOpen, setCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState(new Date().toISOString().split("T")[0]);

  const isCustom = currentPeriod.includes("_");
  const activeTab = isCustom ? "custom" : currentPeriod;

  const handlePeriodChange = (period: string) => {
    if (period === "custom") {
      setCustomOpen(true);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (period === "30j") {
      params.delete("period");
    } else {
      params.set("period", period);
    }
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleCustomSubmit = () => {
    if (!customFrom || !customTo) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", `${customFrom}_${customTo}`);
    router.push(`/dashboard?${params.toString()}`);
    setCustomOpen(false);
  };

  // Format custom range for display
  const customLabel = isCustom
    ? (() => {
        const [from, to] = currentPeriod.split("_");
        const fromDate = new Date(from);
        const toDate = new Date(to);
        return `${fromDate.getDate()}/${fromDate.getMonth() + 1} — ${toDate.getDate()}/${toDate.getMonth() + 1}`;
      })()
    : null;

  return (
    <div className="flex items-center gap-1.5">
      {PERIODS.map((p) => {
        if (p.value === "custom") {
          return (
            <Dialog key={p.value} open={customOpen} onOpenChange={setCustomOpen}>
              <DialogTrigger asChild>
                <button
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors min-h-[32px] flex items-center gap-1",
                    activeTab === "custom"
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  <CalendarRange className="h-3 w-3" />
                  {customLabel ?? p.label}
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Période personnalisée</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Du</Label>
                      <Input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Au</Label>
                      <Input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleCustomSubmit}
                    className="w-full"
                    disabled={!customFrom || !customTo}
                  >
                    Appliquer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          );
        }
        return (
          <button
            key={p.value}
            onClick={() => handlePeriodChange(p.value)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors min-h-[32px]",
              activeTab === p.value
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
