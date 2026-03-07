"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { VentesClient } from "./ventes-client";
import { CSVImportSalesDialog } from "./csv-import-sales-dialog";
import { Upload } from "lucide-react";

interface SaleItem {
  sale: {
    id: string;
    salePrice: string;
    saleDate: string;
    platform: string | null;
    platformFee: string | null;
    shippingCost: string | null;
    otherFees: string | null;
    buyerUsername: string | null;
    paymentStatus: string | null;
    paymentMethod: string | null;
  };
  variant: {
    purchasePrice: string;
    sizeVariant: string | null;
  };
  product: {
    name: string;
    imageUrl: string | null;
    sku: string | null;
  };
}

interface VentesTabsProps {
  userSales: SaleItem[];
  userName?: string;
}

export function VentesTabs({ userSales, userName }: VentesTabsProps) {
  const [showImportCSV, setShowImportCSV] = useState(false);

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
          onClick={() => setShowImportCSV(true)}
          title="Importer CSV"
        >
          <Upload className="h-3.5 w-3.5" />
        </Button>
      </div>

      <VentesClient salesData={userSales} userName={userName} />

      <CSVImportSalesDialog
        open={showImportCSV}
        onClose={() => setShowImportCSV(false)}
      />
    </>
  );
}
