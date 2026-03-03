"use client";

import { useState } from "react";
import Image from "next/image";
import { Camera, Loader2, Package } from "lucide-react";
// Upload via server-side proxy (avoids R2 CORS issues)
import { updateProductImage } from "@/lib/actions/product-actions";
import { toast } from "sonner";

interface ImageUploadProps {
  productId: string;
  currentImage: string | null;
}

export function ImageUpload({ productId, currentImage }: ImageUploadProps) {
  const [image, setImage] = useState(currentImage);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Compress image client-side
      const { default: imageCompression } = await import("browser-image-compression");
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 800,
        maxSizeMB: 0.2,
        useWebWorker: true,
      });

      // Upload via server-side proxy to avoid R2 CORS issues
      const formData = new FormData();
      formData.append("file", compressed);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { publicUrl } = await uploadRes.json();

      // Update product image in DB
      await updateProductImage(productId, publicUrl);

      setImage(publicUrl);
      toast.success("Photo mise à jour");
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <label className="relative block w-full h-48 rounded-xl overflow-hidden bg-secondary cursor-pointer group">
      {image ? (
        <Image src={image} alt="Product" fill className="object-cover" sizes="(max-width: 512px) 100vw" />
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
          <Package className="h-8 w-8" />
          <span className="text-sm">Ajouter une photo</span>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        ) : (
          <Camera className="h-6 w-6 text-white" />
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
        disabled={uploading}
      />
    </label>
  );
}
