"use client";

import {
  useState,
  useRef,
  useTransition,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { GripVertical, Move } from "lucide-react";
import { type WidgetSize } from "@/lib/queries/user-preferences";

/* ── Constants ── */
const LONG_PRESS_MS = 500;
const SCROLL_THRESHOLD = 10;
const GAP = 16; // gap-4

interface SortableWidgetListProps {
  widgetIds: string[];
  widgetSizes: Record<string, WidgetSize>;
  renderWidget: (id: string) => ReactNode;
  onReorder: (
    newOrder: string[],
    sizes?: Record<string, WidgetSize>,
  ) => Promise<void>;
  className?: string;
}

interface TouchDragState {
  id: string;
  startIndex: number;
  currentTargetIndex: number;
  itemHeight: number;
}

export function SortableWidgetList({
  widgetIds,
  widgetSizes,
  renderWidget,
  onReorder,
  className = "",
}: SortableWidgetListProps) {
  const [order, setOrder] = useState(widgetIds);
  /* Desktop drag */
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  /* Touch drag */
  const [touchDrag, setTouchDrag] = useState<TouchDragState | null>(null);

  const [, startTransition] = useTransition();
  const dragNodeRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Long-press refs
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);
  // Ref for drag state (avoids stale closures in touch handlers)
  const touchDragRef = useRef<TouchDragState | null>(null);
  // Snapshot of item rects at drag start (keyed by rendered index)
  const itemRectsRef = useRef<Map<number, DOMRect>>(new Map());
  // Container rect snapshot
  const containerRectRef = useRef<DOMRect | null>(null);

  // Sync from parent if widgetIds change
  if (JSON.stringify(widgetIds) !== JSON.stringify(order)) {
    const sortedProp = [...widgetIds].sort().join(",");
    const sortedOrder = [...order].sort().join(",");
    if (sortedProp !== sortedOrder) {
      setOrder(widgetIds);
    }
  }

  const getSize = (id: string): WidgetSize => widgetSizes[id] ?? "horizontal";

  // Build rendered items (needed by handlers)
  const renderedItems: { id: string; content: ReactNode; size: WidgetSize }[] =
    [];
  for (const id of order) {
    const content = renderWidget(id);
    if (content) {
      renderedItems.push({ id, content, size: getSize(id) });
    }
  }

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  // Lock body scroll during touch drag
  const isDragging = touchDrag !== null;
  useEffect(() => {
    if (!isDragging) return;

    const prevent = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", prevent, { passive: false });
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("touchmove", prevent);
      document.body.style.overflow = "";
    };
  }, [isDragging]);

  /* ── Desktop HTML5 Drag & Drop ── */

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    dragNodeRef.current = e.currentTarget as HTMLDivElement;
    e.dataTransfer.effectAllowed = "move";
    requestAnimationFrame(() => {
      if (dragNodeRef.current) dragNodeRef.current.style.opacity = "0.4";
    });
  };

  const handleDragEnd = () => {
    if (dragNodeRef.current) dragNodeRef.current.style.opacity = "1";
    setDraggedId(null);
    setDragOverId(null);
    dragNodeRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== draggedId) setDragOverId(id);
  };

  const handleDragLeave = () => setDragOverId(null);

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const newOrder = [...order];
    const di = newOrder.indexOf(draggedId);
    const ti = newOrder.indexOf(targetId);
    if (di === -1 || ti === -1) return;

    newOrder.splice(di, 1);
    newOrder.splice(ti, 0, draggedId);
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

  /* ── Touch: long-press → animated drag to any position ── */

  const handleTouchStart = (id: string, e: React.TouchEvent) => {
    const t = e.touches[0];
    touchOrigin.current = { x: t.clientX, y: t.clientY };

    cancelLongPress();
    longPressTimer.current = setTimeout(() => {
      // Snapshot all item rects + container
      const rects = new Map<number, DOMRect>();
      let startIdx = -1;
      let dragHeight = 0;

      itemRefs.current.forEach((el, refId) => {
        const idx = renderedItems.findIndex((item) => item.id === refId);
        if (idx >= 0) {
          const rect = el.getBoundingClientRect();
          rects.set(idx, rect);
          if (refId === id) {
            startIdx = idx;
            dragHeight = rect.height;
          }
        }
      });

      if (startIdx === -1) return;
      itemRectsRef.current = rects;
      containerRectRef.current =
        containerRef.current?.getBoundingClientRect() ?? null;

      const state: TouchDragState = {
        id,
        startIndex: startIdx,
        currentTargetIndex: startIdx,
        itemHeight: dragHeight + GAP,
      };

      touchDragRef.current = state;
      setTouchDrag(state);

      // Apply initial drag style directly (no re-render delay)
      const el = itemRefs.current.get(id);
      if (el) {
        el.style.transform = "scale(1.04)";
        el.style.zIndex = "50";
        el.style.boxShadow =
          "0 0 0 2px rgba(201,206,238,0.6), 0 25px 50px -12px rgba(0,0,0,0.6)";
        el.style.position = "relative";
        el.style.borderRadius = "0.75rem";
      }

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, LONG_PRESS_MS);
  };

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const drag = touchDragRef.current;

      if (!drag) {
        // Not yet dragging — cancel long-press if finger scrolled
        if (touchOrigin.current) {
          const t = e.touches[0];
          const dx = Math.abs(t.clientX - touchOrigin.current.x);
          const dy = Math.abs(t.clientY - touchOrigin.current.y);
          if (dx > SCROLL_THRESHOLD || dy > SCROLL_THRESHOLD) {
            cancelLongPress();
          }
        }
        return;
      }

      const currentY = e.touches[0].clientY;
      const startY = touchOrigin.current?.y ?? currentY;
      const deltaY = currentY - startY;

      // Move dragged widget directly (smooth, no re-render)
      const draggedEl = itemRefs.current.get(drag.id);
      if (draggedEl) {
        draggedEl.style.transform = `translateY(${deltaY}px) scale(1.04)`;
      }

      // Compute target index from finger position vs snapshot centers
      const draggedRect = itemRectsRef.current.get(drag.startIndex);
      if (!draggedRect) return;

      const draggedCenterY =
        draggedRect.top + draggedRect.height / 2 + deltaY;
      let targetIdx = drag.startIndex;

      itemRectsRef.current.forEach((rect, idx) => {
        if (idx === drag.startIndex) return;
        const centerY = rect.top + rect.height / 2;

        if (idx > drag.startIndex && draggedCenterY > centerY) {
          targetIdx = Math.max(targetIdx, idx);
        }
        if (idx < drag.startIndex && draggedCenterY < centerY) {
          targetIdx = Math.min(targetIdx, idx);
        }
      });

      // Only update state when target changes (triggers shift animation)
      if (targetIdx !== drag.currentTargetIndex) {
        const updated = { ...drag, currentTargetIndex: targetIdx };
        touchDragRef.current = updated;
        setTouchDrag(updated);
        // Haptic tick on target change
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(10);
        }
      }
    },
    [cancelLongPress],
  );

  const clearDragStyles = useCallback(() => {
    const drag = touchDragRef.current;
    if (drag) {
      const el = itemRefs.current.get(drag.id);
      if (el) {
        el.style.transform = "";
        el.style.zIndex = "";
        el.style.boxShadow = "";
        el.style.position = "";
        el.style.borderRadius = "";
      }
    }
    itemRefs.current.forEach((el) => {
      el.style.transform = "";
      el.style.transition = "";
    });
  }, []);

  const finalizeDrag = useCallback(() => {
    cancelLongPress();

    const drag = touchDragRef.current;
    if (drag && drag.currentTargetIndex !== drag.startIndex) {
      const targetItem = renderedItems[drag.currentTargetIndex];
      if (targetItem) {
        const newOrder = [...order];
        const fromIdx = newOrder.indexOf(drag.id);
        const toIdx = newOrder.indexOf(targetItem.id);
        if (fromIdx !== -1 && toIdx !== -1) {
          newOrder.splice(fromIdx, 1);
          newOrder.splice(toIdx, 0, drag.id);
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
    }

    clearDragStyles();
    touchDragRef.current = null;
    setTouchDrag(null);
    touchOrigin.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelLongPress, clearDragStyles, order, widgetIds, widgetSizes, onReorder]);

  const handleTouchEnd = useCallback(() => {
    finalizeDrag();
  }, [finalizeDrag]);

  const handleTouchCancel = useCallback(() => {
    cancelLongPress();
    clearDragStyles();
    touchDragRef.current = null;
    setTouchDrag(null);
    touchOrigin.current = null;
  }, [cancelLongPress, clearDragStyles]);

  // Compute shift transforms for non-dragged items
  const getShiftStyle = (
    renderedIdx: number,
  ): React.CSSProperties | undefined => {
    if (!touchDrag) return undefined;
    const { startIndex, currentTargetIndex, itemHeight } = touchDrag;

    if (renderedIdx === startIndex) return undefined; // dragged item styled via DOM

    if (startIndex < currentTargetIndex) {
      if (renderedIdx > startIndex && renderedIdx <= currentTargetIndex) {
        return {
          transform: `translateY(-${itemHeight}px)`,
          transition: "transform 200ms ease",
        };
      }
    } else if (startIndex > currentTargetIndex) {
      if (renderedIdx >= currentTargetIndex && renderedIdx < startIndex) {
        return {
          transform: `translateY(${itemHeight}px)`,
          transition: "transform 200ms ease",
        };
      }
    }

    return {
      transform: "translateY(0)",
      transition: "transform 200ms ease",
    };
  };

  // Compute drop indicator line position
  const getDropLineTop = (): number | null => {
    if (
      !touchDrag ||
      touchDrag.currentTargetIndex === touchDrag.startIndex ||
      !containerRectRef.current
    )
      return null;

    const { currentTargetIndex, startIndex, itemHeight } = touchDrag;
    const targetRect = itemRectsRef.current.get(currentTargetIndex);
    if (!targetRect) return null;

    const cTop = containerRectRef.current.top;

    if (currentTargetIndex > startIndex) {
      // Dragging down — line after shifted target
      return targetRect.bottom - itemHeight - cTop + GAP / 2;
    } else {
      // Dragging up — line before shifted target
      return targetRect.top + itemHeight - cTop - GAP / 2;
    }
  };

  const dropLineTop = getDropLineTop();

  return (
    <>
      {/* Full-screen overlay — locks everything, dark dim */}
      {touchDrag && (
        <div className="fixed inset-0 z-40 bg-black/40 pointer-events-auto">
          {/* Drag mode banner */}
          <div className="absolute top-0 left-0 right-0 safe-area-top">
            <div className="flex items-center justify-center gap-2 py-2 bg-primary/10 backdrop-blur-sm">
              <Move className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">
                Deplace ton widget puis relache
              </span>
            </div>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className={`grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 ${className} ${
          touchDrag ? "relative z-[45]" : ""
        }`}
      >
        {/* Drop indicator line */}
        {dropLineTop !== null && (
          <div
            className="absolute left-2 right-2 z-[52] pointer-events-none flex items-center col-span-full"
            style={{
              top: dropLineTop,
              transition: "top 150ms ease",
            }}
          >
            <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
            <div className="h-[2px] flex-1 bg-primary rounded-full shadow-[0_0_8px_rgba(201,206,238,0.6)]" />
            <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
          </div>
        )}

        {renderedItems.map(({ id, content, size }, idx) => (
          <div
            key={id}
            ref={(el) => {
              if (el) itemRefs.current.set(id, el);
              else itemRefs.current.delete(id);
            }}
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
            style={getShiftStyle(idx)}
            className={`relative group ${
              !touchDrag ? "transition-all" : ""
            } ${size === "horizontal" ? "lg:col-span-2" : "lg:col-span-1"} ${
              dragOverId === id && draggedId !== id
                ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-background rounded-xl"
                : ""
            } ${
              touchDrag && touchDrag.id !== id ? "opacity-50" : ""
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
    </>
  );
}
