"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MailOpen, Mail, Search, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminSentMessage {
  id: string;
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
  fromUsername: string | null;
  fromAvatar: string | null;
  fromDiscordId: string | null;
  toUsername: string | null;
}

interface AdminSentMessagesProps {
  messages: AdminSentMessage[];
}

function getAvatarUrl(discordId: string | null, avatar: string | null): string | null {
  if (!discordId || !avatar) return null;
  if (avatar.startsWith("http")) return avatar;
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=32`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminSentMessages({ messages }: AdminSentMessagesProps) {
  const [selected, setSelected] = useState<AdminSentMessage | null>(null);
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? messages.filter(
        (m) =>
          m.subject.toLowerCase().includes(search.toLowerCase()) ||
          m.body.toLowerCase().includes(search.toLowerCase()) ||
          (m.fromUsername ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (m.toUsername ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : messages;

  if (messages.length === 0) {
    return (
      <div className="rounded-xl bg-secondary p-8 text-center">
        <Mail className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Aucun message envoye</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par sujet, contenu, expediteur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {filtered.length} message{filtered.length > 1 ? "s" : ""} envoye{filtered.length > 1 ? "s" : ""}
        </p>

        <div className="space-y-1.5">
          {filtered.map((msg) => {
            const avatarUrl = getAvatarUrl(msg.fromDiscordId, msg.fromAvatar);
            return (
              <button
                key={msg.id}
                type="button"
                onClick={() => setSelected(msg)}
                className="w-full flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:bg-secondary/50 text-left transition-all"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full" />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary">
                        {(msg.fromUsername ?? "S")[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{msg.subject}</span>
                    {msg.read ? (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 bg-success/10 text-success border-0">Lu</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 bg-warning/10 text-warning border-0">Non lu</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[11px] text-muted-foreground font-medium">{msg.fromUsername ?? "Staff"}</span>
                    <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/50" />
                    <span className="text-[11px] text-muted-foreground">{msg.toUsername ?? "Utilisateur"}</span>
                    <span className="text-[10px] text-muted-foreground/50 ml-auto flex-shrink-0">{formatDate(msg.createdAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground/70 line-clamp-1 mt-0.5">{msg.body}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MailOpen className="h-4 w-4 text-primary" />
              {selected?.subject}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-xs font-medium", "text-primary")}>{selected.fromUsername ?? "Staff"}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                <span className="text-xs text-muted-foreground">{selected.toUsername ?? "Utilisateur"}</span>
                <span className="text-[10px] text-muted-foreground/60 ml-auto">{formatDate(selected.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                {selected.read ? (
                  <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-0">Lu par le destinataire</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-0">Non lu</Badge>
                )}
              </div>
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-sm whitespace-pre-wrap">{selected.body}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
