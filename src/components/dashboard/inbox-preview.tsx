import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface InboxMessagePreview {
  id: string;
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
  fromUsername: string | null;
  fromAvatar: string | null;
  fromDiscordId: string | null;
}

interface InboxPreviewWidgetProps {
  messages: InboxMessagePreview[];
}

function timeAgo(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "maintenant";
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}j`;
  return `${Math.floor(diffD / 7)}sem`;
}

function getAvatarUrl(discordId: string | null, avatar: string | null): string | null {
  if (!discordId || !avatar) return null;
  if (avatar.startsWith("http")) return avatar;
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=32`;
}

export function InboxPreviewWidget({ messages }: InboxPreviewWidgetProps) {
  const unreadCount = messages.filter((m) => !m.read).length;
  const displayMessages = messages.slice(0, 4);

  return (
    <Card className="p-4 lg:p-5 bg-card border-border h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          Inbox
          {unreadCount > 0 && (
            <Badge variant="outline" className="bg-primary/20 text-primary border-0 text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </h3>
        <Link href="/inbox" className="text-[10px] text-primary hover:underline">
          Voir tout
        </Link>
      </div>

      {displayMessages.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun message</p>
      ) : (
        <div className="space-y-2.5">
          {displayMessages.map((msg) => {
            const avatarUrl = getAvatarUrl(msg.fromDiscordId, msg.fromAvatar);
            return (
              <Link
                key={msg.id}
                href="/inbox"
                className={cn(
                  "flex items-start gap-2.5 group",
                  !msg.read && "font-medium"
                )}
              >
                {/* Avatar */}
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/20 border border-border overflow-hidden flex items-center justify-center">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-primary">
                      {(msg.fromUsername ?? "S")[0].toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Message info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {!msg.read && (
                      <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                    )}
                    <p className="text-xs leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                      {msg.subject}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground truncate">
                      {msg.fromUsername ?? "Staff"}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">·</span>
                    <span className="text-[10px] text-muted-foreground/50">
                      {timeAgo(msg.createdAt)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}

          {messages.length > 4 && (
            <p className="text-[10px] text-muted-foreground text-center pt-1">
              +{messages.length - 4} autre{messages.length - 4 > 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
