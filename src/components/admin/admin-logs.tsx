"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, X, Trash2, Mail, Megaphone, Package, ImageIcon, Settings, Shield } from "lucide-react";

export interface AdminLogItem {
  id: string;
  action: string;
  target: string | null;
  details: string | null;
  createdAt: string;
  adminUsername: string | null;
  adminAvatar: string | null;
  adminDiscordId: string | null;
}

interface AdminLogsProps {
  logs: AdminLogItem[];
}

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  delete_sale: { label: "Suppression vente", icon: Trash2, color: "text-danger" },
  send_message: { label: "Message envoye", icon: Mail, color: "text-primary" },
  create_advice: { label: "Conseil cree", icon: Megaphone, color: "text-success" },
  toggle_advice: { label: "Conseil modifie", icon: Megaphone, color: "text-warning" },
  delete_advice: { label: "Conseil supprime", icon: Megaphone, color: "text-danger" },
  create_admin_product: { label: "Produit admin cree", icon: Package, color: "text-success" },
  update_admin_product: { label: "Produit admin modifie", icon: Package, color: "text-warning" },
  delete_admin_product: { label: "Produit admin supprime", icon: Package, color: "text-danger" },
  set_product_image: { label: "Image produit ajoutee", icon: ImageIcon, color: "text-primary" },
  set_sku_image: { label: "Image SKU ajoutee", icon: ImageIcon, color: "text-primary" },
  update_webhook: { label: "Webhook modifie", icon: Settings, color: "text-warning" },
};

function getAvatarUrl(discordId: string | null, avatar: string | null) {
  if (!discordId || !avatar) return null;
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.webp?size=32`;
}

function formatRelativeTime(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "a l'instant";
  if (diffMin < 60) return `il y a ${diffMin}min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays < 7) return `il y a ${diffDays}j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function AdminLogs({ logs }: AdminLogsProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return logs;
    const q = search.toLowerCase();
    return logs.filter((log) => {
      const matchAction = log.action.toLowerCase().includes(q);
      const matchDetails = log.details?.toLowerCase().includes(q);
      const matchTarget = log.target?.toLowerCase().includes(q);
      const matchAdmin = log.adminUsername?.toLowerCase().includes(q);
      const config = ACTION_CONFIG[log.action];
      const matchLabel = config?.label.toLowerCase().includes(q);
      return matchAction || matchDetails || matchTarget || matchAdmin || matchLabel;
    });
  }, [logs, search]);

  if (logs.length === 0) {
    return (
      <div className="rounded-xl bg-secondary p-8 text-center">
        <p className="text-muted-foreground">
          Aucun log pour le moment. Les actions admin seront enregistrees ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher dans les logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card border-border h-9 text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {search && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} resultat{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Logs list */}
      <div className="space-y-1.5">
        {filtered.map((log) => {
          const config = ACTION_CONFIG[log.action] ?? {
            label: log.action,
            icon: Shield,
            color: "text-muted-foreground",
          };
          const Icon = config.icon;
          const avatarUrl = getAvatarUrl(log.adminDiscordId, log.adminAvatar);

          return (
            <Card key={log.id} className="p-3 gap-0 bg-card border-border">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={log.adminUsername ?? "Admin"}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {log.adminUsername ?? "Admin"}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${config.color}`}>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground ml-auto flex-shrink-0">
                      {formatRelativeTime(log.createdAt)}
                    </span>
                  </div>
                  {log.details && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {log.details}
                    </p>
                  )}
                  {log.target && (
                    <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
                      {log.target}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
