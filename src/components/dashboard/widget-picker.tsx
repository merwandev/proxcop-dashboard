"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Settings2, RectangleHorizontal, Square } from "lucide-react";
import { type WidgetDefinition } from "@/lib/utils/widget-registry";
import { type WidgetSize } from "@/lib/queries/user-preferences";
import { toast } from "sonner";

interface WidgetPickerProps {
  /** Available widgets for this page */
  availableWidgets: WidgetDefinition[];
  /** Currently active widget IDs (ordered) */
  activeWidgets: string[];
  /** Current sizes per widget */
  widgetSizes: Record<string, WidgetSize>;
  /** Server action to save the layout */
  onSave: (widgets: string[], sizes?: Record<string, WidgetSize>) => Promise<void>;
}

export function WidgetPicker({ availableWidgets, activeWidgets, widgetSizes, onSave }: WidgetPickerProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(activeWidgets);
  const [sizes, setSizes] = useState<Record<string, WidgetSize>>(widgetSizes);
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    setSelected(activeWidgets);
    setSizes(widgetSizes);
    setOpen(true);
  };

  const handleToggle = (widgetId: string, enabled: boolean) => {
    if (enabled) {
      setSelected((prev) => [...prev, widgetId]);
    } else {
      setSelected((prev) => prev.filter((id) => id !== widgetId));
    }
  };

  const handleSizeToggle = (widgetId: string) => {
    setSizes((prev) => ({
      ...prev,
      [widgetId]: prev[widgetId] === "square" ? "horizontal" : "square",
    }));
  };

  const getSize = (widgetId: string): WidgetSize => sizes[widgetId] ?? "horizontal";

  const handleSave = () => {
    startTransition(async () => {
      try {
        await onSave(selected, sizes);
        setOpen(false);
        toast.success("Layout sauvegarde");
      } catch {
        toast.error("Erreur lors de la sauvegarde");
      }
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        onClick={handleOpen}
      >
        <Settings2 className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">Personnaliser</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Personnaliser les widgets</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {availableWidgets.map((widget) => {
              const Icon = widget.icon;
              const isActive = selected.includes(widget.id);
              const size = getSize(widget.id);
              return (
                <div
                  key={widget.id}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-card border border-border transition-opacity ${
                    !isActive ? "opacity-40" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{widget.label}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Size toggle — only when active */}
                    {isActive && (
                      <button
                        type="button"
                        onClick={() => handleSizeToggle(widget.id)}
                        disabled={isPending}
                        className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-background border border-border hover:border-primary/40 transition-colors"
                        title={size === "horizontal" ? "Horizontal (pleine largeur)" : "Carre (demi largeur)"}
                      >
                        {size === "horizontal" ? (
                          <RectangleHorizontal className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Square className="h-3.5 w-3.5 text-primary" />
                        )}
                      </button>
                    )}
                    <Switch
                      checked={isActive}
                      onCheckedChange={(checked) => handleToggle(widget.id, checked)}
                      disabled={isPending}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground pt-1">
            <div className="flex items-center gap-1">
              <RectangleHorizontal className="h-3 w-3" />
              <span>Horizontal</span>
            </div>
            <div className="flex items-center gap-1">
              <Square className="h-3 w-3" />
              <span>Carre</span>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={isPending || selected.length === 0}
            className="w-full h-10"
          >
            Sauvegarder
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
