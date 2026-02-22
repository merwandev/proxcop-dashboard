"use client";

import { useState, useTransition } from "react";
import { AdviceBanner } from "./advice-banner";
import { dismissAdviceAction } from "@/lib/actions/advice-actions";
import { ChevronDown } from "lucide-react";

interface AdviceItem {
  id: string;
  sku: string;
  title: string;
  message: string;
  severity: string;
  readBy: string[] | null;
}

interface AdviceSectionProps {
  advice: AdviceItem[];
  userId: string;
}

export function AdviceSection({ advice, userId }: AdviceSectionProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [showRead, setShowRead] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Split into unread and read
  const unread = advice.filter(
    (a) => !dismissedIds.has(a.id) && !(a.readBy ?? []).includes(userId)
  );
  const read = advice.filter(
    (a) => dismissedIds.has(a.id) || (a.readBy ?? []).includes(userId)
  );

  const handleDismiss = (adviceId: string) => {
    // Optimistic update
    setDismissedIds((prev) => new Set([...prev, adviceId]));

    startTransition(async () => {
      try {
        await dismissAdviceAction(adviceId);
      } catch {
        // Revert on error
        setDismissedIds((prev) => {
          const next = new Set(prev);
          next.delete(adviceId);
          return next;
        });
      }
    });
  };

  if (advice.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Unread advice banners */}
      {unread.map((a) => (
        <AdviceBanner
          key={a.id}
          id={a.id}
          title={a.title}
          message={a.message}
          severity={a.severity}
          sku={a.sku}
          onDismiss={handleDismiss}
        />
      ))}

      {/* Toggle for read messages */}
      {read.length > 0 && (
        <button
          onClick={() => setShowRead(!showRead)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform ${showRead ? "rotate-180" : ""}`}
          />
          {read.length} message{read.length > 1 ? "s" : ""} lu{read.length > 1 ? "s" : ""}
        </button>
      )}

      {/* Read advice (collapsed by default) */}
      {showRead && read.map((a) => (
        <div key={a.id} className="opacity-50">
          <AdviceBanner
            title={a.title}
            message={a.message}
            severity={a.severity}
            sku={a.sku}
          />
        </div>
      ))}
    </div>
  );
}
