"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { PLATFORMS, CATEGORIES } from "@/lib/utils/constants";
import { Package, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommunitySale {
  saleId: string;
  productName: string;
  sku: string | null;
  imageUrl: string | null;
  sizeVariant: string | null;
  salePrice: string;
  platform: string | null;
  saleDate: string;
  category: string;
}

interface CommunityFeedProps {
  sales: CommunitySale[];
}

export function CommunityFeed({ sales }: CommunityFeedProps) {
  const [search, setSearch] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get unique platforms from actual data
  const usedPlatforms = useMemo(() => {
    const platforms = new Set<string>();
    sales.forEach((s) => {
      if (s.platform) platforms.add(s.platform);
    });
    return PLATFORMS.filter((p) => platforms.has(p.value));
  }, [sales]);

  // Get unique categories from actual data
  const usedCategories = useMemo(() => {
    const cats = new Set<string>();
    sales.forEach((s) => {
      if (s.category) cats.add(s.category);
    });
    return CATEGORIES.filter((c) => cats.has(c.value));
  }, [sales]);

  // Search filter
  const searchFiltered = useMemo(() => {
    if (!search) return sales;
    const q = search.toLowerCase();
    return sales.filter((s) => {
      const matchName = s.productName.toLowerCase().includes(q);
      const matchSku = s.sku?.toLowerCase().includes(q);
      const matchSize = s.sizeVariant?.toLowerCase().includes(q);
      return matchName || matchSku || matchSize;
    });
  }, [sales, search]);

  // Platform filter
  const platformFiltered = useMemo(() => {
    if (!selectedPlatform) return searchFiltered;
    return searchFiltered.filter((s) => s.platform === selectedPlatform);
  }, [searchFiltered, selectedPlatform]);

  // Category filter
  const filtered = useMemo(() => {
    if (!selectedCategory) return platformFiltered;
    return platformFiltered.filter((s) => s.category === selectedCategory);
  }, [platformFiltered, selectedCategory]);

  const handleFilterChange = (
    setter: React.Dispatch<React.SetStateAction<string | null>>,
    value: string | null
  ) => {
    setter(value);
  };

  if (sales.length === 0) {
    return (
      <p className="text-center py-12 text-sm text-muted-foreground">
        Aucune vente communautaire pour le moment
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un produit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card border-border h-9 text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Platform filters */}
      {usedPlatforms.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => handleFilterChange(setSelectedPlatform, null)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              !selectedPlatform
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-card border-border text-muted-foreground hover:border-border-hover"
            )}
          >
            Toutes
          </button>
          {usedPlatforms.map((p) => (
            <button
              key={p.value}
              onClick={() =>
                handleFilterChange(
                  setSelectedPlatform,
                  selectedPlatform === p.value ? null : p.value
                )
              }
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                selectedPlatform === p.value
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-card border-border text-muted-foreground hover:border-border-hover"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Category filters */}
      {usedCategories.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => handleFilterChange(setSelectedCategory, null)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              !selectedCategory
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-card border-border text-muted-foreground hover:border-border-hover"
            )}
          >
            Toutes categories
          </button>
          {usedCategories.map((c) => (
            <button
              key={c.value}
              onClick={() =>
                handleFilterChange(
                  setSelectedCategory,
                  selectedCategory === c.value ? null : c.value
                )
              }
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                selectedCategory === c.value
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-card border-border text-muted-foreground hover:border-border-hover"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Results count */}
      {(search || selectedPlatform || selectedCategory) && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} resultat{filtered.length !== 1 ? "s" : ""}
          {search && <span> pour &quot;{search}&quot;</span>}
          {selectedPlatform && (
            <span>
              {" "}sur {PLATFORMS.find((p) => p.value === selectedPlatform)?.label}
            </span>
          )}
          {selectedCategory && (
            <span>
              {" "}en {CATEGORIES.find((c) => c.value === selectedCategory)?.label}
            </span>
          )}
        </p>
      )}

      {/* Sales list */}
      {filtered.length === 0 ? (
        <p className="text-center py-12 text-sm text-muted-foreground">
          Aucun resultat
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((sale) => (
            <Card key={sale.saleId} className="p-3 bg-card border-border">
              <div className="flex gap-3">
                {/* Product image */}
                <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-white flex-shrink-0">
                  {sale.imageUrl ? (
                    <Image
                      src={sale.imageUrl}
                      alt={sale.productName}
                      fill
                      className="object-contain p-1"
                      sizes="56px"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-[13px] leading-tight line-clamp-2">
                        {sale.productName}
                        {sale.sizeVariant && (
                          <span className="text-muted-foreground font-normal">
                            {" "}&mdash; {sale.sizeVariant}
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(sale.saleDate)}
                        </span>
                        {sale.platform && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-border capitalize"
                          >
                            {sale.platform}
                          </Badge>
                        )}
                        {sale.sku && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {sale.sku}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Price */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold">
                        {formatCurrency(Number(sale.salePrice))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
