import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield } from "lucide-react";
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
            alt="Proxcop"
            width={32}
            height={32}
            className="rounded-full"
          />
          <span className="font-semibold text-sm">Proxcop</span>
        </div>
        <div className="flex items-center gap-2">
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
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={session.user.image ?? undefined}
                alt={session.user.name ?? "User"}
              />
              <AvatarFallback className="bg-secondary text-xs">
                {session.user.name?.charAt(0).toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </header>
  );
}
