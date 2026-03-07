"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { importStockFromCSV } from "@/lib/actions/import-actions";
import { Upload, Download, Loader2, FileText, AlertCircle, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";

interface CSVImportStockDialogProps {
  open: boolean;
  onClose: () => void;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function CSVImportStockDialog({ open, onClose }: CSVImportStockDialogProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);

  const reset = useCallback(() => {
    setFile(null);
    setPreview([]);
    setTotalRows(0);
    setResult(null);
    setProgress(0);
    setProgressText("");
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!f.name.endsWith(".csv")) {
      toast.error("Fichier CSV requis");
      return;
    }

    setFile(f);
    setResult(null);

    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, string>[];
        setTotalRows(data.length);
        setPreview(data.slice(0, 3));
      },
      error: () => {
        toast.error("Erreur de lecture du fichier");
        setFile(null);
      },
    });
  };

  const handleImport = () => {
    if (!file) return;

    setImporting(true);
    setProgress(0);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const allRows = results.data as any[];
          const batches = chunk(allRows, 15);
          let totalImported = 0;
          const allErrors: string[] = [];

          for (let i = 0; i < batches.length; i++) {
            const res = await importStockFromCSV(batches[i]);
            totalImported += res.imported;
            allErrors.push(...res.errors);

            const pct = Math.round(((i + 1) / batches.length) * 100);
            setProgress(pct);
            setProgressText(`${pct}% — ${totalImported}/${allRows.length} importés`);
          }

          setResult({ imported: totalImported, errors: allErrors });
          if (totalImported > 0) {
            toast.success(`${totalImported} produit${totalImported > 1 ? "s" : ""} importé${totalImported > 1 ? "s" : ""}`);
            router.refresh();
          }
          if (allErrors.length > 0 && totalImported === 0) {
            toast.error("Aucun produit importé");
          }
        } catch (e) {
          toast.error((e as Error).message || "Erreur d'import");
        } finally {
          setImporting(false);
        }
      },
      error: () => {
        toast.error("Erreur de lecture du fichier");
        setImporting(false);
      },
    });
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch("/api/import/template/stock");
      if (!res.ok) throw new Error("Erreur");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template-stock.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erreur de telechargement");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importer du stock (CSV)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template download */}
          <div className="rounded-lg border border-border bg-card/50 p-3">
            <p className="text-xs text-muted-foreground mb-2">
              Utilisez le template CSV pour formater vos donnees correctement.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleDownloadTemplate}
            >
              <Download className="h-3.5 w-3.5" />
              Telecharger le template
            </Button>
          </div>

          {/* File input */}
          {!result && !importing && (
            <div className="space-y-2">
              <label
                htmlFor="csv-stock-input"
                className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-colors"
              >
                {file ? (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{totalRows} ligne{totalRows !== 1 ? "s" : ""}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); reset(); }}
                      className="ml-2 p-1 rounded hover:bg-accent"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm text-muted-foreground">
                      Cliquez pour selectionner un fichier CSV
                    </p>
                  </div>
                )}
              </label>
              <input
                id="csv-stock-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && !result && !importing && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Apercu ({Math.min(3, totalRows)} / {totalRows})</p>
              <div className="rounded-lg border border-border overflow-x-auto">
                <table className="text-[11px] w-full">
                  <thead>
                    <tr className="bg-card">
                      {Object.keys(preview[0]).slice(0, 5).map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                      {Object.keys(preview[0]).length > 5 && (
                        <th className="px-2 py-1.5 text-muted-foreground">...</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        {Object.values(row).slice(0, 5).map((v, j) => (
                          <td key={j} className="px-2 py-1 whitespace-nowrap max-w-[120px] truncate">
                            {v || <span className="text-muted-foreground">—</span>}
                          </td>
                        ))}
                        {Object.values(row).length > 5 && (
                          <td className="px-2 py-1 text-muted-foreground">...</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {importing && (
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">{progressText || "Import en cours..."}</p>
            </div>
          )}

          {/* Import result */}
          {result && (
            <div className="space-y-3">
              {result.imported > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-success/10 border border-success/20 p-3">
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-bold">{result.imported}</span> produit{result.imported > 1 ? "s" : ""} importé{result.imported > 1 ? "s" : ""}
                  </p>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="rounded-lg bg-danger/10 border border-danger/20 p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-danger flex-shrink-0" />
                    <p className="text-sm font-medium">{result.errors.length} erreur{result.errors.length > 1 ? "s" : ""}</p>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-0.5">
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-[11px] text-muted-foreground">{err}</p>
                    ))}
                  </div>
                </div>
              )}
              <Button variant="outline" className="w-full" onClick={handleClose}>
                Fermer
              </Button>
            </div>
          )}

          {/* Import button */}
          {file && !result && !importing && (
            <Button
              onClick={handleImport}
              className="w-full gap-1.5"
            >
              <Upload className="h-4 w-4" />
              Importer {totalRows} ligne{totalRows !== 1 ? "s" : ""}
            </Button>
          )}

          {/* Help text */}
          {!file && !result && !importing && (
            <div className="text-[11px] text-muted-foreground space-y-1">
              <p><strong>Colonnes requises :</strong> Produit, Prix Achat, Date Achat</p>
              <p><strong>Colonnes optionnelles :</strong> SKU, Categorie, Taille, Prix Cible, Statut, Lieu Stockage, Date Retour, Fournisseur</p>
              <p><strong>Formats date :</strong> AAAA-MM-JJ ou JJ/MM/AAAA</p>
              <p><strong>Categories :</strong> sneakers, pokemon, lego, random</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
