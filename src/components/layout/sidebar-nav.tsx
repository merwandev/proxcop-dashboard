"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Package, Receipt, TrendingUp, Settings, Coins, Calendar, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/stock", label: "Stock", icon: Package },
  { href: "/ventes", label: "Ventes", icon: Receipt },
  { href: "/stats", label: "Analytics", icon: TrendingUp },
  { href: "/cashback", label: "Cashback", icon: Coins },
  { href: "/calendar", label: "Calendrier", icon: Calendar },
  { href: "/inbox", label: "Inbox", icon: Mail },
];

const bottomItems = [
  { href: "/settings", label: "Parametres", icon: Settings },
];

interface SidebarNavProps {
  hasStockNotification?: boolean;
}

export function SidebarNav({ hasStockNotification }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 w-[220px] flex-col border-r border-border bg-card/50">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="ProxStock"
          width={28}
          height={28}
          className="rounded-full"
        />
        <span className="font-semibold text-sm tracking-tight">ProxStock</span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const showDot = item.href === "/stock" && hasStockNotification;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              <div className="relative flex-shrink-0">
                <item.icon className="h-[18px] w-[18px]" />
                {showDot && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-400 ring-2 ring-card" />
                )}
              </div>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 pb-4 space-y-1">
        {bottomItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
