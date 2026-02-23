"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { saveCommunityOptInAction } from "@/lib/actions/preferences-actions";
import { Users } from "lucide-react";
import { toast } from "sonner";

interface CommunitySettingsProps {
  communityOptIn: boolean;
}

export function CommunitySettings({ communityOptIn }: CommunitySettingsProps) {
  const [enabled, setEnabled] = useState(communityOptIn);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    startTransition(async () => {
      try {
        await saveCommunityOptInAction(checked);
        toast.success(checked ? "Donnees partagees" : "Donnees masquees");
      } catch {
        setEnabled(!checked);
        toast.error("Erreur");
      }
    });
  };

  return (
    <Card className="p-4 gap-0 bg-card border-border">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Communaute</h3>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="community-opt-in" className="text-sm font-normal text-muted-foreground cursor-pointer flex-1">
          Contribuer aux donnees communautaires (anonyme)
        </Label>
        <Switch
          id="community-opt-in"
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={isPending}
        />
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        Vos donnees sont partagees de maniere 100% anonyme pour alimenter les tendances, prix du marche et stats de la communaute.
        Aucun nom ni detail personnel n&apos;est visible.
      </p>
    </Card>
  );
}
