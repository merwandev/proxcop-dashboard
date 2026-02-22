"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toggleAdviceAction, deleteAdviceAction } from "@/lib/actions/advice-actions";
import { Loader2, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface AdviceItem {
  id: string;
  sku: string;
  title: string;
  message: string;
  severity: string;
  active: boolean;
  createdAt: string;
  creatorUsername: string | null;
}

interface AdviceListProps {
  items: AdviceItem[];
}

const severityConfig: Record<string, { label: string; className: string }> = {
  info: { label: "Info", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  warning: { label: "Attention", className: "bg-warning/10 text-warning border-warning/20" },
  critical: { label: "Critique", className: "bg-danger/10 text-danger border-danger/20" },
};

export function AdviceList({ items }: AdviceListProps) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const handleToggle = async (id: string) => {
    setLoadingIds((prev) => new Set(prev).add(id));
    try {
      await toggleAdviceAction(id);
      toast.success("Statut mis a jour");
    } catch {
      toast.error("Erreur");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDelete = async (id: string) => {
    setLoadingIds((prev) => new Set(prev).add(id));
    try {
      await deleteAdviceAction(id);
      toast.success("Conseil supprime");
    } catch {
      toast.error("Erreur");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-secondary p-8 text-center">
        <p className="text-muted-foreground text-sm">
          Aucun conseil publie. Creez-en un ci-dessus.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const config = severityConfig[item.severity] ?? severityConfig.info;
        const isLoading = loadingIds.has(item.id);

        return (
          <div
            key={item.id}
            className={`rounded-xl border p-4 space-y-2 ${
              item.active
                ? "bg-card border-border"
                : "bg-card/50 border-border/50 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={config.className}
                  >
                    {config.label}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    {item.sku}
                  </span>
                  {!item.active && (
                    <Badge variant="secondary" className="text-[10px]">
                      Desactive
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium mt-1.5 line-clamp-1">
                  {item.title}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.message}
                </p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Par {item.creatorUsername ?? "staff"} &middot;{" "}
                  {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>

              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggle(item.id)}
                  disabled={isLoading}
                  className="h-8 w-8 p-0"
                  title={item.active ? "Desactiver" : "Activer"}
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : item.active ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  disabled={isLoading}
                  className="h-8 w-8 p-0 text-danger hover:text-danger"
                  title="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
