"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { saveSaleSuccessAnimationAction } from "@/lib/actions/preferences-actions";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

interface AnimationSettingsProps {
  saleSuccessAnimation: boolean;
}

export function AnimationSettings({ saleSuccessAnimation }: AnimationSettingsProps) {
  const [enabled, setEnabled] = useState(saleSuccessAnimation);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    startTransition(async () => {
      try {
        await saveSaleSuccessAnimationAction(checked);
        toast.success(checked ? "Animation activee" : "Animation desactivee");
      } catch {
        setEnabled(!checked);
        toast.error("Erreur");
      }
    });
  };

  return (
    <Card className="p-4 gap-0 bg-card border-border">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Animation de vente</h3>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="sale-success-animation" className="text-sm font-normal text-muted-foreground cursor-pointer flex-1">
          Afficher l&apos;animation de succes apres une vente
        </Label>
        <Switch
          id="sale-success-animation"
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={isPending}
        />
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        Une animation s&apos;affiche avec le profit et la possibilite de partager le resultat.
      </p>
    </Card>
  );
}
