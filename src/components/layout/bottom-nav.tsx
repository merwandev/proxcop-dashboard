"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Package, Receipt, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const baseNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/stock", label: "Stock", icon: Package },
  { href: "/ventes", label: "Ventes", icon: Receipt },
  { href: "/stats", label: "Stats", icon: TrendingUp },
];

interface BottomNavProps {
  hasStockNotification?: boolean;
}

export function BottomNav({ hasStockNotification }: BottomNavProps) {
  const pathname = usePathname();
  const navItems = baseNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border lg:hidden">
      <div className="flex items-center justify-around h-16 pb-[env(safe-area-inset-bottom)] max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const showDot = item.href === "/stock" && hasStockNotification;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] rounded-lg transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {showDot && (
                  <span className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-blue-400 ring-2 ring-background" />
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
