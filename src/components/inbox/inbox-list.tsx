"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  markMessageAsReadAction,
  markAllMessagesAsReadAction,
} from "@/lib/actions/message-actions";
import { Mail, MailOpen, CheckCheck, Inbox } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InboxMessage {
  id: string;
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
  fromUsername: string;
  fromAvatar: string | null;
  fromDiscordId: string | null;
}

interface InboxListProps {
  messages: InboxMessage[];
}

function getAvatarUrl(discordId: string | null, avatar: string | null): string | null {
  if (!discordId || !avatar) return null;
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function InboxList({ messages }: InboxListProps) {
  const [items, setItems] = useState(messages);
  const [selected, setSelected] = useState<InboxMessage | null>(null);
  const [isPending, startTransition] = useTransition();

  const unreadCount = items.filter((m) => !m.read).length;

  const handleOpen = (msg: InboxMessage) => {
    setSelected(msg);
    if (!msg.read) {
      // Mark as read
      setItems((prev) => prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m)));
      startTransition(async () => {
        try {
          await markMessageAsReadAction(msg.id);
        } catch {
          // Revert
          setItems((prev) => prev.map((m) => (m.id === msg.id ? { ...m, read: false } : m)));
        }
      });
    }
  };

  const handleMarkAllRead = () => {
    setItems((prev) => prev.map((m) => ({ ...m, read: true })));
    startTransition(async () => {
      try {
        await markAllMessagesAsReadAction();
        toast.success("Tous les messages marques comme lus");
      } catch {
        toast.error("Erreur");
      }
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-secondary p-10 text-center">
        <Inbox className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Aucun message</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Les messages du staff apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <>
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="gap-1.5 text-xs text-muted-foreground"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Tout marquer comme lu
          </Button>
        </div>
      )}

      <div className="space-y-1.5">
        {items.map((msg) => {
          const avatarUrl = getAvatarUrl(msg.fromDiscordId, msg.fromAvatar);
          return (
            <button
              key={msg.id}
              type="button"
              onClick={() => handleOpen(msg)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                msg.read
                  ? "bg-card border-border hover:bg-secondary/50"
                  : "bg-primary/5 border-primary/20 hover:bg-primary/10"
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={msg.fromUsername}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">
                      {msg.fromUsername.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-medium truncate", !msg.read && "text-primary")}>
                    {msg.subject}
                  </span>
                  {!msg.read && (
                    <Mail className="h-3 w-3 text-primary flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {msg.fromUsername} · {formatDate(msg.createdAt)}
                </p>
                <p className="text-xs text-muted-foreground/70 line-clamp-1 mt-0.5">
                  {msg.body}
                </p>
              </div>
            </button>
          );
        })}
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
              <div className="flex items-center gap-2">
                {getAvatarUrl(selected.fromDiscordId, selected.fromAvatar) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getAvatarUrl(selected.fromDiscordId, selected.fromAvatar)!}
                    alt={selected.fromUsername}
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary">
                      {selected.fromUsername.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium">{selected.fromUsername}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(selected.createdAt)}
                </span>
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
