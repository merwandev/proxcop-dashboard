import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth-utils";
import { getUnreadCount } from "@/lib/queries/messages";
import { UserMenu } from "./logout-button";
import { Shield, Settings, Mail, Calendar, Coins } from "lucide-react";
import Link from "next/link";

export async function AppHeader() {
  const session = await auth();
  const admin = isAdminRole(session?.user?.role);
  const unreadCount = session?.user?.id ? await getUnreadCount(session.user.id) : 0;

  return (
    <header className="sticky top-0 z-40 glass border-b border-border safe-area-top">
      <div className="flex items-center justify-between h-14 px-4 lg:px-8 max-w-lg lg:max-w-6xl mx-auto">
        {/* Mobile: logo + name / Desktop: empty spacer (logo in sidebar) */}
        <div className="flex items-center gap-2 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="ProxStock"
            width={32}
            height={32}
            className="rounded-full"
          />
          <span className="font-semibold text-sm">ProxStock</span>
        </div>
        <div className="hidden lg:block" />

        <div className="flex items-center gap-3">
          <Link
            href="/cashback"
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Cashback"
          >
            <Coins className="h-4.5 w-4.5" />
          </Link>
          <Link
            href="/calendar"
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Calendrier"
          >
            <Calendar className="h-4.5 w-4.5" />
          </Link>
          <Link
            href="/inbox"
            className="relative text-muted-foreground hover:text-foreground transition-colors"
            title="Inbox"
          >
            <Mail className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <Link
            href="/settings"
            className="text-muted-foreground hover:text-foreground transition-colors lg:hidden"
            title="Parametres"
          >
            <Settings className="h-4.5 w-4.5" />
          </Link>
          {admin && (
            <Link
              href="/admin"
              className="text-primary hover:text-primary/80 transition-colors"
              title="Admin"
            >
              <Shield className="h-4.5 w-4.5" />
            </Link>
          )}
          {session?.user && (
            <UserMenu
              userImage={session.user.image}
              userName={session.user.name}
            />
          )}
        </div>
      </div>
    </header>
  );
}
