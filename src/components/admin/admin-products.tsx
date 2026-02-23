"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CATEGORIES } from "@/lib/utils/constants";
import {
  createAdminProductAction,
  updateAdminProductAction,
  deleteAdminProductAction,
} from "@/lib/actions/admin-product-actions";
import { Loader2, Plus, Package, Trash2, Pencil, Upload, X, Link2 } from "lucide-react";
import { toast } from "sonner";

interface AdminProductItem {
  id: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  category: string;
  sizes: string[];
  createdAt: string;
  creatorUsername: string | null;
}

interface AdminProductsProps {
  products: AdminProductItem[];
}

export function AdminProducts({ products }: AdminProductsProps) {
  const [items, setItems] = useState(products);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<AdminProductItem | null>(null);

  const handleCreated = (item: AdminProductItem) => {
    setItems((prev) => [item, ...prev]);
    setShowAdd(false);
  };

  const handleUpdated = (item: AdminProductItem) => {
    setItems((prev) => prev.map((p) => (p.id === item.id ? item : p)));
    setEditItem(null);
  };

  const handleDeleted = (id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
    setEditItem(null);
  };

  return (
    <div className="space-y-4">
      <Button onClick={() => setShowAdd(true)} size="sm" className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Ajouter un produit
      </Button>

      {items.length === 0 ? (
        <div className="rounded-xl bg-secondary p-8 text-center">
          <Package className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            Aucun produit admin. Les produits ajoutés ici apparaîtront dans la recherche de tous les membres.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
            >
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
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight truncate">
                  {item.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {item.sku && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {item.sku}
                    </span>
                  )}
                  <Badge variant="secondary" className="text-[9px] h-4 px-1">
                    {CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category}
                  </Badge>
                  {item.sizes.length > 0 && (
                    <span className="text-[9px] text-muted-foreground">
                      {item.sizes.length} taille{item.sizes.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditItem(item)}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AdminProductDialog
          mode="create"
          onClose={() => setShowAdd(false)}
          onCreated={handleCreated}
        />
      )}

      {editItem && (
        <AdminProductDialog
          mode="edit"
          item={editItem}
          onClose={() => setEditItem(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}

// ─── Dialog ──────────────────────────────────────────────────────────

function AdminProductDialog({
  mode,
  item,
  onClose,
  onCreated,
  onUpdated,
  onDeleted,
}: {
  mode: "create" | "edit";
  item?: AdminProductItem;
  onClose: () => void;
  onCreated?: (item: AdminProductItem) => void;
  onUpdated?: (item: AdminProductItem) => void;
  onDeleted?: (id: string) => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [sku, setSku] = useState(item?.sku ?? "");
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");
  const [category, setCategory] = useState(item?.category ?? "sneakers");
  const [sizesInput, setSizesInput] = useState(item?.sizes?.join(", ") ?? "");
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { default: imageCompression } = await import("browser-image-compression");
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 800,
        maxSizeMB: 0.2,
        useWebWorker: true,
      });
      // Upload via server-side proxy to avoid R2 CORS issues
      const formData = new FormData();
      formData.append("file", compressed);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload failed");
      }
      const { publicUrl } = await res.json();
      setImageUrl(publicUrl);
      toast.success("Image ajoutee");
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const parseSizes = (): string[] => {
    return sizesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Nom requis");
      return;
    }

    startTransition(async () => {
      try {
        const sizes = parseSizes();

        if (mode === "create") {
          const result = await createAdminProductAction({
            name: name.trim(),
            sku: sku.trim() || undefined,
            imageUrl: imageUrl || undefined,
            category,
            sizes,
          });
          onCreated?.({
            id: result.id,
            name: result.name,
            sku: result.sku,
            imageUrl: result.imageUrl,
            category: result.category,
            sizes: (result.sizes as string[]) ?? [],
            createdAt: result.createdAt.toISOString(),
            creatorUsername: null,
          });
          toast.success("Produit admin cree");
        } else if (item) {
          const result = await updateAdminProductAction(item.id, {
            name: name.trim(),
            sku: sku.trim() || undefined,
            imageUrl: imageUrl || null,
            category,
            sizes,
          });
          onUpdated?.({
            ...item,
            name: result.name,
            sku: result.sku,
            imageUrl: result.imageUrl,
            category: result.category,
            sizes: (result.sizes as string[]) ?? [],
          });
          toast.success("Produit modifie");
        }
      } catch {
        toast.error("Erreur");
      }
    });
  };

  const handleDelete = () => {
    if (!item) return;
    startTransition(async () => {
      try {
        await deleteAdminProductAction(item.id);
        onDeleted?.(item.id);
        toast.success("Produit supprime");
      } catch {
        toast.error("Erreur");
      }
    });
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nouveau produit admin" : "Modifier le produit"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Image */}
          <div>
            {imageUrl ? (
              <div className="relative rounded-xl overflow-hidden bg-secondary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Produit"
                  className="w-full h-32 object-contain bg-white/5"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* File upload */}
                <label className="cursor-pointer block">
                  <div className="rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors p-4 text-center">
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                        <p className="text-xs text-muted-foreground">Importer une photo</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>

                {/* Divider */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-[10px] text-muted-foreground">ou</span>
                  <div className="flex-1 border-t border-border" />
                </div>

                {/* URL input */}
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="https://... (URL image)"
                      className="h-9 text-sm pl-8"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val && (val.startsWith("http://") || val.startsWith("https://"))) {
                            setImageUrl(val);
                          } else if (val) {
                            toast.error("URL invalide");
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const val = e.target.value.trim();
                        if (val && (val.startsWith("http://") || val.startsWith("https://"))) {
                          setImageUrl(val);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nom *</Label>
            <Input
              placeholder="Nike Dunk Low Panda..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">SKU</Label>
              <Input
                placeholder="DD1391-100"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="h-9 text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Categorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Tailles (separees par des virgules)
            </Label>
            <Input
              placeholder="US 8, US 9, US 10, US 11..."
              value={sizesInput}
              onChange={(e) => setSizesInput(e.target.value)}
              className="h-9 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              {parseSizes().length > 0
                ? `${parseSizes().length} taille${parseSizes().length > 1 ? "s" : ""}`
                : "Aucune taille"}
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            {mode === "edit" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
                className="gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isPending || !name.trim()}
              className="flex-1 gap-1"
              size="sm"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : mode === "create" ? (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Creer
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
