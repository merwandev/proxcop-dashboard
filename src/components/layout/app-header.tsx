import Image from "next/image";
import { auth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export async function AppHeader() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-40 glass border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Proxcop"
            width={32}
            height={32}
            className="rounded-full"
          />
          <span className="font-semibold text-sm">Proxcop</span>
        </div>
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
    </header>
  );
}
