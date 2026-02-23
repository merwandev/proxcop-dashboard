"use client";

import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { toast } from "sonner";

export function ExportCsvButton() {
  const handleExport = async () => {
    try {
      const res = await fetch("/api/export/csv");
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proxcop-ventes-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exporte");
    } catch {
      toast.error("Erreur lors de l'export CSV");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-muted-foreground hover:text-foreground"
      onClick={handleExport}
      title="Exporter CSV"
    >
      <FileDown className="h-3.5 w-3.5" />
    </Button>
  );
}
