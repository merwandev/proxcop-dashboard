"use client";

import {
  useState,
  useRef,
  useTransition,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { GripVertical } from "lucide-react";
import { type WidgetSize } from "@/lib/queries/user-preferences";

/* ── Long-press constants ── */
const LONG_PRESS_MS = 500;
const SCROLL_THRESHOLD = 10; // px — cancel long-press if finger drifts more

interface SortableWidgetListProps {
  /** Ordered widget IDs */
  widgetIds: string[];
  /** Size per widget (default = "horizontal") */
  widgetSizes: Record<string, WidgetSize>;
  /** Render function for each widget — returns null if widget should be hidden */
  renderWidget: (id: string) => ReactNode;
  /** Server action to persist the new order */
  onReorder: (
    newOrder: string[],
    sizes?: Record<string, WidgetSize>,
  ) => Promise<void>;
  /** Optional CSS class for the container */
  className?: string;
}

export function SortableWidgetList({
  widgetIds,
  widgetSizes,
  renderWidget,
  onReorder,
  className = "",
}: SortableWidgetListProps) {
  const [order, setOrder] = useState(widgetIds);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [touchDragId, setTouchDragId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const dragNodeRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Long-press refs
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);

  // Sync from parent if widgetIds change
  if (JSON.stringify(widgetIds) !== JSON.stringify(order)) {
    const sortedProp = [...widgetIds].sort().join(",");
    const sortedOrder = [...order].sort().join(",");
    if (sortedProp !== sortedOrder) {
      setOrder(widgetIds);
    }
  }

  const getSize = (id: string): WidgetSize => widgetSizes[id] ?? "horizontal";

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  // Block page scroll while touch-dragging (needs non-passive listener)
  useEffect(() => {
    if (!touchDragId || !containerRef.current) return;

    const el = containerRef.current;
    const prevent = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("touchmove", prevent, { passive: false });

    return () => {
      el.removeEventListener("touchmove", prevent);
    };
  }, [touchDragId]);

  /* ── Desktop HTML5 Drag & Drop ── */

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    dragNodeRef.current = e.currentTarget as HTMLDivElement;
    e.dataTransfer.effectAllowed = "move";
    requestAnimationFrame(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = "0.4";
      }
    });
  };

  const handleDragEnd = () => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = "1";
    }
    setDraggedId(null);
    setDragOverId(null);
    dragNodeRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== draggedId) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const newOrder = [...order];
    const draggedIndex = newOrder.indexOf(draggedId);
    const targetIndex = newOrder.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedId);

    setOrder(newOrder);
    setDraggedId(null);
    setDragOverId(null);

    startTransition(async () => {
      try {
        await onReorder(newOrder, widgetSizes);
      } catch {
        setOrder(widgetIds);
      }
    });
  };

  /* ── Touch: long-press gate → swipe to reorder ── */

  const handleTouchStart = (id: string, e: React.TouchEvent) => {
    const t = e.touches[0];
    touchOrigin.current = { x: t.clientX, y: t.clientY };

    cancelLongPress();
    longPressTimer.current = setTimeout(() => {
      setTouchDragId(id);
      // Haptic feedback
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(30);
      }
    }, LONG_PRESS_MS);
  };

  const handleTouchMove = useCallback(
    (_e: React.TouchEvent) => {
      // Already in drag mode — scroll is blocked via non-passive listener
      if (touchDragId) return;

      // Not yet dragging — cancel long-press if finger scrolled
      if (touchOrigin.current) {
        const t = _e.touches[0];
        const dx = Math.abs(t.clientX - touchOrigin.current.x);
        const dy = Math.abs(t.clientY - touchOrigin.current.y);
        if (dx > SCROLL_THRESHOLD || dy > SCROLL_THRESHOLD) {
          cancelLongPress();
        }
      }
    },
    [touchDragId, cancelLongPress],
  );

  const handleTouchEnd = (e: React.TouchEvent) => {
    cancelLongPress();

    if (touchDragId) {
      const startY = touchOrigin.current?.y ?? 0;
      const endY = e.changedTouches[0].clientY;
      const diff = endY - startY;

      if (Math.abs(diff) > 50) {
        const currentIndex = order.indexOf(touchDragId);
        const direction = diff > 0 ? 1 : -1;
        const targetIndex = currentIndex + direction;

        if (targetIndex >= 0 && targetIndex < order.length) {
          const newOrder = [...order];
          newOrder.splice(currentIndex, 1);
          newOrder.splice(targetIndex, 0, touchDragId);
          setOrder(newOrder);

          startTransition(async () => {
            try {
              await onReorder(newOrder, widgetSizes);
            } catch {
              setOrder(widgetIds);
            }
          });
        }
      }

      setTouchDragId(null);
    }

    touchOrigin.current = null;
  };

  const handleTouchCancel = () => {
    cancelLongPress();
    setTouchDragId(null);
    touchOrigin.current = null;
  };

  // Filter out null-rendering widgets and build items
  const renderedItems: { id: string; content: ReactNode; size: WidgetSize }[] =
    [];
  for (const id of order) {
    const content = renderWidget(id);
    if (content) {
      renderedItems.push({ id, content, size: getSize(id) });
    }
  }

  return (
    <div
      ref={containerRef}
      className={`grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 ${className}`}
    >
      {renderedItems.map(({ id, content, size }) => (
        <div
          key={id}
          draggable
          onDragStart={(e) => handleDragStart(e, id)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, id)}
          onTouchStart={(e) => handleTouchStart(id, e)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          className={`relative group transition-all ${
            size === "horizontal" ? "lg:col-span-2" : "lg:col-span-1"
          } ${
            dragOverId === id && draggedId !== id
              ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-background rounded-xl"
              : ""
          } ${
            touchDragId === id
              ? "scale-[0.97] opacity-80 ring-2 ring-primary/60 rounded-xl"
              : ""
          }`}
        >
          {/* Drag handle — visible on hover (desktop) */}
          <div className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:flex items-center cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          {content}
        </div>
      ))}
    </div>
  );
}
