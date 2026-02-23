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
    <Card className="p-3 gap-0 bg-card border-border">
      <div className="flex items-center gap-2 mb-1.5">
        <Webhook className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="font-medium text-xs">Discord Webhook</h3>
        {saved && (
          <CheckCircle2 className="h-3 w-3 text-success ml-auto" />
        )}
      </div>
      <div className="flex gap-1.5">
        <Input
          id="webhook-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://discord.com/api/webhooks/..."
          className="text-[11px] font-mono h-8 flex-1"
        />
        <Button onClick={handleSave} size="sm" className="h-8 px-3" disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "OK"}
        </Button>
      </div>
    </Card>
  );
}
