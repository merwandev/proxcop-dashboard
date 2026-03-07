import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth-utils";
import { UserMenu } from "./logout-button";
import { Shield, Settings, Mail } from "lucide-react";
import Link from "next/link";

interface AppHeaderProps {
  unreadMessages?: number;
}

export async function AppHeader({ unreadMessages = 0 }: AppHeaderProps) {
  const session = await auth();
  const admin = isAdminRole(session?.user?.role);

  return (
    <header className="sticky top-0 z-40 glass border-b border-border safe-area-top">
      <div className="flex items-center justify-between h-14 px-4 lg:px-8 max-w-lg lg:max-w-6xl mx-auto">
        {/* Mobile: logo + name / Desktop: empty spacer (logo in sidebar) */}
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="ProxStock"
            width={32}
            height={32}
            className="rounded-full lg:w-10 lg:h-10"
          />
          <span className="font-semibold text-sm lg:text-base">ProxStock</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/inbox"
            className="relative text-muted-foreground hover:text-foreground transition-colors lg:hidden"
            title="Inbox"
          >
            <Mail className="h-4.5 w-4.5" />
            {unreadMessages > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {unreadMessages > 99 ? "99+" : unreadMessages}
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
