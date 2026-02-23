"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePlatformFeesAction } from "@/lib/actions/preferences-actions";
import { PLATFORMS } from "@/lib/utils/constants";
import { Percent } from "lucide-react";
import { toast } from "sonner";

// Platforms that have commission fees (exclude discord, other)
const FEE_PLATFORMS = PLATFORMS.filter(
  (p) => p.value !== "discord" && p.value !== "other"
);

interface PlatformFeesSettingsProps {
  platformFees: Record<string, number>;
}

export function PlatformFeesSettings({ platformFees }: PlatformFeesSettingsProps) {
  const [fees, setFees] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    FEE_PLATFORMS.forEach((p) => {
      const val = platformFees[p.value];
      initial[p.value] = val != null && val > 0 ? String(val) : "";
    });
    return initial;
  });
  const [isPending, startTransition] = useTransition();

  const handleChange = (platform: string, value: string) => {
    setFees((prev) => ({ ...prev, [platform]: value }));
  };

  const handleSave = (platform: string) => {
    const val = parseFloat(fees[platform]);
    if (fees[platform] !== "" && (isNaN(val) || val < 0 || val > 100)) {
      toast.error("Le taux doit etre entre 0% et 100%");
      return;
    }

    // Build the full fees object
    const feesObj: Record<string, number> = {};
    FEE_PLATFORMS.forEach((p) => {
      const num = parseFloat(fees[p.value]);
      if (!isNaN(num) && num > 0) {
        feesObj[p.value] = num;
      }
    });

    startTransition(async () => {
      try {
        await savePlatformFeesAction(feesObj);
        toast.success(`Commission ${platform} sauvegardee`);
      } catch {
        toast.error("Erreur lors de la sauvegarde");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Percent className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Commissions plateformes</h2>
      </div>

      <div className="px-3 py-2.5 rounded-lg bg-card border border-border space-y-2.5">
        <p className="text-[11px] text-muted-foreground">
          Definissez le % de commission par plateforme. Il sera auto-rempli lors de l&apos;enregistrement d&apos;une vente.
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {FEE_PLATFORMS.map((p) => (
            <div key={p.value} className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground w-16 flex-shrink-0 truncate">
                {p.label}
              </Label>
              <div className="flex items-center gap-1 flex-1">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={fees[p.value]}
                  onChange={(e) => handleChange(p.value, e.target.value)}
                  onBlur={() => handleSave(p.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSave(p.value);
                    }
                  }}
                  className="h-8 text-xs"
                  disabled={isPending}
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
