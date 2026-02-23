"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, X } from "lucide-react";

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const hasScannedRef = useRef(false);

  const stopScanner = useCallback(async () => {
    try {
      const scanner = html5QrCodeRef.current as { stop?: () => Promise<void>; clear?: () => void } | null;
      if (scanner?.stop) {
        await scanner.stop();
      }
      if (scanner?.clear) {
        scanner.clear();
      }
    } catch {
      // Ignore
    }
    html5QrCodeRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    hasScannedRef.current = false;

    const startScanner = async () => {
      try {
        setError(null);
        setScanning(true);

        // Dynamic import to avoid SSR issues
        const { Html5Qrcode } = await import("html5-qrcode");

        if (!mounted || !scannerRef.current) return;

        const scannerId = "barcode-scanner-reader";

        // Create a div for the scanner if needed
        let readerDiv = document.getElementById(scannerId);
        if (!readerDiv && scannerRef.current) {
          readerDiv = document.createElement("div");
          readerDiv.id = scannerId;
          scannerRef.current.appendChild(readerDiv);
        }

        const scanner = new Html5Qrcode(scannerId);
        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 140 },
            aspectRatio: 1.5,
          },
          (decodedText) => {
            // Prevent multiple scans
            if (hasScannedRef.current) return;
            hasScannedRef.current = true;

            // Only accept numeric barcodes (UPC/EAN/GTIN)
            const cleaned = decodedText.replace(/\s/g, "");
            if (/^\d{8,14}$/.test(cleaned)) {
              onScan(cleaned);
              stopScanner();
            } else {
              hasScannedRef.current = false;
            }
          },
          () => {
            // QR code scan error — ignored (happens continuously while scanning)
          }
        );
      } catch (err) {
        if (!mounted) return;
        const message =
          err instanceof Error ? err.message : "Erreur camera";
        if (message.includes("NotAllowedError") || message.includes("Permission")) {
          setError("Acces a la camera refuse. Veuillez autoriser l'acces dans les parametres de votre navigateur.");
        } else if (message.includes("NotFoundError")) {
          setError("Aucune camera trouvee sur cet appareil.");
        } else {
          setError(message);
        }
        setScanning(false);
      }
    };

    // Short delay to let the dialog mount
    const timer = setTimeout(startScanner, 300);

    return () => {
      mounted = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [open, onScan, stopScanner]);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Scanner un code-barres
            </DialogTitle>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 rounded-lg hover:bg-secondary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="relative bg-black">
          <div ref={scannerRef} className="w-full min-h-[300px]" />

          {scanning && !error && (
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-xs text-white/80 bg-black/50 inline-block px-3 py-1 rounded-full">
                Placez le code-barres dans le cadre
              </p>
            </div>
          )}

          {!scanning && !error && (
            <div className="flex items-center justify-center min-h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 space-y-3">
            <p className="text-sm text-danger">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="w-full"
            >
              Fermer
            </Button>
          </div>
        )}

        <div className="px-4 pb-4">
          <p className="text-[10px] text-muted-foreground text-center">
            Scannez le code-barres UPC/EAN de la boite pour trouver le produit
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
