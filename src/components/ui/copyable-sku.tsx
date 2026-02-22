"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyableSkuProps {
  sku: string;
  className?: string;
}

export function CopyableSku({ sku, className }: CopyableSkuProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.writeText(sku).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    },
    [sku]
  );

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1 font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
        className
      )}
      title="Copier le SKU"
    >
      <span className="truncate">{sku}</span>
      {copied ? (
        <Check className="h-2.5 w-2.5 text-success flex-shrink-0" />
      ) : (
        <Copy className="h-2.5 w-2.5 flex-shrink-0 opacity-50" />
      )}
    </button>
  );
}
