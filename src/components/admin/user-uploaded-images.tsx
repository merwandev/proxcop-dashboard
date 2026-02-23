"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { adminLinkImageGlobally } from "@/lib/actions/product-actions";
import { Loader2, Globe, Check, User, Package } from "lucide-react";
import { toast } from "sonner";

interface UserUploadedImage {
  imageUrl: string;
  name: string;
  sku: string | null;
  category: string;
  ownerUsername: string;
  count: number;
}

interface UserUploadedImagesProps {
  images: UserUploadedImage[];
}

export function UserUploadedImages({ images }: UserUploadedImagesProps) {
  const [linkedKeys, setLinkedKeys] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const handleLinkGlobally = (item: UserUploadedImage) => {
    const key = item.sku ? `sku:${item.sku}` : `name:${item.name}`;
    setLoadingKey(key);
    startTransition(async () => {
      try {
        await adminLinkImageGlobally(item.imageUrl, item.sku, item.name);
        setLinkedKeys((prev) => new Set(prev).add(key));
        toast.success("Image liee globalement");
      } catch {
        toast.error("Erreur");
      } finally {
        setLoadingKey(null);
      }
    });
  };

  if (images.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        Aucune image uploadee par les utilisateurs.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {images.map((item) => {
        const key = item.sku ? `sku:${item.sku}` : `name:${item.name}`;
        const isLinked = linkedKeys.has(key);
        const isLoading = loadingKey === key;

        return (
          <div
            key={key}
            className={`flex items-center gap-3 rounded-xl p-3 ${
              isLinked ? "bg-success/10 border border-success/20" : "bg-secondary"
            }`}
          >
            {/* Image preview */}
            <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-white flex-shrink-0">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-contain p-0.5"
                  sizes="48px"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                {item.sku && (
                  <span className="font-mono">{item.sku}</span>
                )}
                {!item.sku && (
                  <span className="italic">Pas de SKU</span>
                )}
                <span className="flex items-center gap-0.5">
                  <User className="h-3 w-3" />
                  {item.ownerUsername}
                </span>
                {item.count > 1 && (
                  <span>{item.count} produits</span>
                )}
              </div>
            </div>

            {/* Action */}
            <div className="flex-shrink-0">
              {isLinked ? (
                <div className="flex items-center gap-1 text-success">
                  <Check className="h-4 w-4" />
                  <span className="text-xs font-medium">Lie</span>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => handleLinkGlobally(item)}
                  disabled={isPending}
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Globe className="h-3 w-3" />
                  )}
                  Lier pour tous
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
