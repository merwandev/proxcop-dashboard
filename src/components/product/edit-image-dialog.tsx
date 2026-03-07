"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { updateProductImage } from "@/lib/actions/product-actions";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";

interface EditImageDialogProps {
  productId: string;
  productName: string;
  trigger: React.ReactNode;
}

export function EditImageDialog({ productId, productName, trigger }: EditImageDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      });
      selectedFileRef.current = compressed;
      setPreview(URL.createObjectURL(compressed));
    } catch {
      toast.error("Erreur de compression");
    }
  };

  const handleUpload = async () => {
    if (!selectedFileRef.current) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFileRef.current);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload échoué");
      const { url } = await res.json();

      await updateProductImage(productId, url);
      toast.success("Image mise à jour");
      setOpen(false);
      setPreview(null);
      selectedFileRef.current = null;
      router.refresh();
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setPreview(null); selectedFileRef.current = null; } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Modifier l&apos;image</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground line-clamp-1">{productName}</p>
        <div className="space-y-4">
          {preview ? (
            <div className="relative mx-auto w-32 h-32 rounded-lg overflow-hidden bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Aperçu" className="w-full h-full object-contain p-1" />
            </div>
          ) : (
            <label
              htmlFor="edit-image-input"
              className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Choisir une image</p>
            </label>
          )}
          <input
            ref={fileRef}
            id="edit-image-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex gap-2">
            {preview && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setPreview(null); selectedFileRef.current = null; fileRef.current?.click(); }}
              >
                Changer
              </Button>
            )}
            <Button
              onClick={handleUpload}
              disabled={!preview || uploading}
              className="flex-1"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
