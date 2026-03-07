"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { saveTaxSettingsAction, saveDeclaredPlatformsAction } from "@/lib/actions/preferences-actions";
import { PLATFORMS } from "@/lib/utils/constants";
import { Percent } from "lucide-react";
import { toast } from "sonner";

interface TaxSettingsProps {
  tvaEnabled: boolean;
  tvaRate: number;
  declaredPlatforms: string[] | null;
}

export function TaxSettings({ tvaEnabled: initialEnabled, tvaRate: initialRate, declaredPlatforms: initialPlatforms }: TaxSettingsProps) {
  const allPlatformValues = PLATFORMS.map((p) => p.value);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [rate, setRate] = useState(initialRate > 0 ? String(initialRate) : "");
  const [platforms, setPlatforms] = useState<string[]>(initialPlatforms ?? allPlatformValues);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    const rateNum = parseFloat(rate) || 0;
    startTransition(async () => {
      try {
        await saveTaxSettingsAction(checked, rateNum);
        toast.success(checked ? "Cotisations activees" : "Cotisations desactivees");
      } catch {
        setEnabled(!checked);
        toast.error("Erreur lors de la sauvegarde");
      }
    });
  };

  const handleRateChange = (value: string) => {
    setRate(value);
  };

  const handleRateSave = () => {
    const rateNum = parseFloat(rate);
    if (!rateNum || rateNum <= 0 || rateNum > 100) {
      toast.error("Le taux doit etre entre 0.01% et 100%");
      return;
    }
    startTransition(async () => {
      try {
        await saveTaxSettingsAction(enabled, rateNum);
        toast.success("Taux de cotisations sauvegarde");
      } catch {
        toast.error("Erreur lors de la sauvegarde");
      }
    });
  };

  const handlePlatformToggle = (platformValue: string, checked: boolean) => {
    const updated = checked
      ? [...platforms, platformValue]
      : platforms.filter((p) => p !== platformValue);
    setPlatforms(updated);
    startTransition(async () => {
      try {
        await saveDeclaredPlatformsAction(updated);
      } catch {
        setPlatforms(platforms);
        toast.error("Erreur lors de la sauvegarde");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Percent className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Cotisations AE</h2>
      </div>

      <div className="px-3 py-2.5 rounded-lg bg-card border border-border space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Auto-entrepreneur</Label>
            <p className="text-[11px] text-muted-foreground">
              Deduit les cotisations du chiffre d&apos;affaires
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={isPending}
          />
        </div>

        {enabled && (
          <>
            <div className="space-y-1.5 pt-1 border-t border-border">
              <Label className="text-xs text-muted-foreground">Taux de cotisations (% du CA)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="13.40"
                  value={rate}
                  onChange={(e) => handleRateChange(e.target.value)}
                  onBlur={handleRateSave}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleRateSave();
                    }
                  }}
                  className="h-9 text-sm max-w-[120px]"
                  disabled={isPending}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Taux courant : 13.40% (achat/revente) ou 23.10% (services)
              </p>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-border">
              <Label className="text-xs text-muted-foreground">Plateformes declarees</Label>
              <p className="text-[10px] text-muted-foreground mb-1.5">
                Seules les ventes sur ces plateformes seront comptees dans le CA declare
              </p>
              <div className="space-y-1">
                {PLATFORMS.map((p) => (
                  <div key={p.value} className="flex items-center justify-between py-1">
                    <span className="text-sm">{p.label}</span>
                    <Switch
                      checked={platforms.includes(p.value)}
                      onCheckedChange={(checked) => handlePlatformToggle(p.value, checked)}
                      disabled={isPending}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
