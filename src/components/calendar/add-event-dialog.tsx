"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createCalendarEventAction } from "@/lib/actions/calendar-actions";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

const EVENT_TYPES = [
  { value: "drop", label: "Drop" },
  { value: "ship", label: "Envoi" },
  { value: "return", label: "Retour" },
  { value: "custom", label: "Custom" },
] as const;

const COLOR_OPTIONS = [
  { value: "", label: "Par defaut" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#f59e0b", label: "Orange" },
  { value: "#ef4444", label: "Rouge" },
  { value: "#22c55e", label: "Vert" },
  { value: "#ec4899", label: "Rose" },
];

interface AddEventDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (event: {
    id: string;
    title: string;
    date: string;
    type: "drop" | "ship" | "return" | "custom";
    color: string | null;
    notes: string | null;
    isAuto: boolean;
  }) => void;
  defaultDate?: string | null;
}

export function AddEventDialog({ open, onClose, onCreated, defaultDate }: AddEventDialogProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split("T")[0]);
  const [type, setType] = useState<"drop" | "ship" | "return" | "custom">("custom");
  const [color, setColor] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  // Reset when dialog opens with new date
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      // Reset
      setTitle("");
      setDate(defaultDate || new Date().toISOString().split("T")[0]);
      setType("custom");
      setColor("");
      setNotes("");
    }
  };

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error("Titre requis");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createCalendarEventAction({
          title: title.trim(),
          date,
          type,
          color: color || undefined,
          notes: notes.trim() || undefined,
        });

        onCreated({
          id: result.id,
          title: result.title,
          date: result.date,
          type: result.type as "drop" | "ship" | "return" | "custom",
          color: result.color,
          notes: result.notes,
          isAuto: false,
        });

        toast.success("Evenement ajoute");
        // Reset
        setTitle("");
        setType("custom");
        setColor("");
        setNotes("");
      } catch (e) {
        toast.error((e as Error).message || "Erreur");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nouvel evenement</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Titre *</Label>
            <Input
              placeholder="Drop Nike, Envoi colis..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate(); } }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-sm max-w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Couleur</Label>
            <div className="flex gap-1.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value || "default"}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    color === c.value ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.value || "var(--primary)" }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea
              placeholder="Details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={isPending || !title.trim()}
            className="w-full gap-1.5"
            size="sm"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Creer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
