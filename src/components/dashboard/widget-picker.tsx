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
import { Settings2, GripVertical } from "lucide-react";
import { type WidgetDefinition } from "@/lib/utils/widget-registry";
import { toast } from "sonner";

interface WidgetPickerProps {
  /** Available widgets for this page */
  availableWidgets: WidgetDefinition[];
  /** Currently active widget IDs (ordered) */
  activeWidgets: string[];
  /** Server action to save the layout */
  onSave: (widgets: string[]) => Promise<void>;
}

export function WidgetPicker({ availableWidgets, activeWidgets, onSave }: WidgetPickerProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(activeWidgets);
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    setSelected(activeWidgets);
    setOpen(true);
  };

  const handleToggle = (widgetId: string, enabled: boolean) => {
    if (enabled) {
      setSelected((prev) => [...prev, widgetId]);
    } else {
      setSelected((prev) => prev.filter((id) => id !== widgetId));
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        await onSave(selected);
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
              return (
                <div
                  key={widget.id}
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-card border border-border transition-opacity ${
                    !isActive ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{widget.label}</span>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) => handleToggle(widget.id, checked)}
                    disabled={isPending}
                  />
                </div>
              );
            })}
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
