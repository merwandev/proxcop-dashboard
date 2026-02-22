"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold">Dashboard</h1>
      <Card className="p-6 bg-card border-border">
        <div className="text-center space-y-3">
          <p className="text-danger font-medium">Erreur de chargement</p>
          <p className="text-sm text-muted-foreground">
            {error.message || "Une erreur est survenue lors du chargement du dashboard."}
          </p>
          <Button onClick={reset} variant="outline" size="sm">
            Réessayer
          </Button>
        </div>
      </Card>
    </div>
  );
}
