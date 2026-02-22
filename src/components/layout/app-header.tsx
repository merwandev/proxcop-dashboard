import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth-utils";
import { UserMenu } from "./logout-button";
import { Shield, Settings } from "lucide-react";
import Link from "next/link";

export async function AppHeader() {
  const session = await auth();
  const admin = isAdminRole(session?.user?.role);

  return (
    <header className="sticky top-0 z-40 glass border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="text-muted-foreground hover:text-foreground transition-colors"
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
