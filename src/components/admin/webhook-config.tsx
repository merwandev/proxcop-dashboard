"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { updateWebhookUrlAction } from "@/lib/actions/config-actions";
import { Loader2, Webhook, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface WebhookConfigProps {
  currentUrl: string | null;
}

export function WebhookConfig({ currentUrl }: WebhookConfigProps) {
  const [url, setUrl] = useState(currentUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!currentUrl);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateWebhookUrlAction(url.trim());
      setSaved(!!url.trim());
      toast.success("Webhook mis a jour");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 bg-card border-border space-y-3">
      <div className="flex items-center gap-2">
        <Webhook className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-medium text-sm">Discord Webhook</h3>
        {saved && (
          <CheckCircle2 className="h-3.5 w-3.5 text-success ml-auto" />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Les ventes seront envoyees anonymement dans le channel Discord configure.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="webhook-url">URL du Webhook</Label>
        <Input
          id="webhook-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://discord.com/api/webhooks/..."
          className="text-xs font-mono"
        />
      </div>
      <Button onClick={handleSave} className="w-full" disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
      </Button>
    </Card>
  );
}
