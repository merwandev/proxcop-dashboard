"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAdviceAction } from "@/lib/actions/advice-actions";
import { Loader2, Search, Package } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface SearchResult {
  productId: string;
  title: string;
  styleId: string;
  imageUrl: string | null;
}

export function AdviceForm() {
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SearchResult | null>(null);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("warning");
  const [submitting, setSubmitting] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/stockx/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.status === "ok" && data.products) {
        setSearchResults(data.products);
      } else {
        setSearchResults([]);
      }
    } catch {
      toast.error("Erreur de recherche");
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchInput = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (value.trim().length >= 2) {
        searchTimeoutRef.current = setTimeout(() => {
          performSearch(value.trim());
        }, 1000);
      } else {
        setSearchResults([]);
      }
    },
    [performSearch]
  );

  const selectProduct = (product: SearchResult) => {
    setSelectedProduct(product);
    setSearchResults([]);
    setSearchInput("");
  };

  const handleSubmit = async () => {
    if (!selectedProduct) {
      toast.error("Selectionnez un produit");
      return;
    }
    if (!message.trim() || message.trim().length < 5) {
      toast.error("Message requis (min 5 caracteres)");
      return;
    }

    setSubmitting(true);
    try {
      await createAdviceAction({
        sku: selectedProduct.styleId,
        title: selectedProduct.title,
        message: message.trim(),
        severity,
      });
      toast.success("Conseil cree avec succes");
      setSelectedProduct(null);
      setMessage("");
      setSeverity("warning");
    } catch {
      toast.error("Erreur lors de la creation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Selected product or search */}
      {selectedProduct ? (
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex gap-3 items-center">
            <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-white flex-shrink-0">
              {selectedProduct.imageUrl ? (
                <Image
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.title}
                  fill
                  className="object-contain p-1"
                  sizes="56px"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-2">{selectedProduct.title}</p>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                {selectedProduct.styleId}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedProduct(null)}
              className="text-xs"
            >
              Changer
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Rechercher un produit</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="SKU ou nom du produit..."
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="pl-9"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="space-y-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-card">
              {searchResults.map((product) => (
                <button
                  key={product.productId}
                  type="button"
                  onClick={() => selectProduct(product)}
                  className="flex gap-3 items-center p-3 w-full text-left hover:bg-secondary transition-colors"
                >
                  <div className="relative h-10 w-10 rounded-md overflow-hidden bg-white flex-shrink-0">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.title}
                        fill
                        className="object-contain p-0.5"
                        sizes="40px"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.title}</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {product.styleId}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Severity */}
      <div className="space-y-2">
        <Label>Severite</Label>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Attention</SelectItem>
            <SelectItem value="critical">Critique</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label>Message pour les membres</Label>
        <Textarea
          placeholder="Ex: Les prix chutent, pensez a retourner si possible avant le 15/03..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
        />
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!selectedProduct || !message.trim() || submitting}
        className="w-full"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : null}
        Publier le conseil
      </Button>
    </div>
  );
}
