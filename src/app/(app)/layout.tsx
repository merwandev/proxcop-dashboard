import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { auth } from "@/lib/auth";
import { hasUnreadAdvice } from "@/lib/queries/product-advice";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const unreadAdvice = session?.user?.id
    ? await hasUnreadAdvice(session.user.id)
    : false;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Desktop sidebar — hidden on mobile */}
      <SidebarNav hasStockNotification={unreadAdvice} />

      {/* Main area — offset by sidebar on desktop */}
      <div className="flex flex-col flex-1 lg:pl-[220px]">
        <AppHeader />
        <main className="flex-1 pb-20 lg:pb-6 px-4 lg:px-8 max-w-lg lg:max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav — hidden on desktop */}
      <BottomNav hasStockNotification={unreadAdvice} />
    </div>
  );
}
