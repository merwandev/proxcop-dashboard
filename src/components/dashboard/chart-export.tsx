"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export function ChartExport() {
  const handleExport = async () => {
    try {
      const { toBlob } = await import("html-to-image");
      const node = document.getElementById("dashboard-export");
      if (!node) return;

      const blob = await toBlob(node, {
        backgroundColor: "#18191E",
        pixelRatio: 2,
      });
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proxcop-stats-${new Date().toISOString().split("T")[0]}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Image exportee");
    } catch {
      toast.error("Erreur lors de l'export");
    }
  };

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
      <Download className="h-3.5 w-3.5" />
      Export PNG
    </Button>
  );
}
