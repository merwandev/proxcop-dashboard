import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getInboxMessages } from "@/lib/queries/messages";
import { InboxList } from "@/components/inbox/inbox-list";

export default async function InboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const messagesRaw = await getInboxMessages(session.user.id);

  const messages = messagesRaw.map((m) => ({
    id: m.id,
    subject: m.subject,
    body: m.body,
    read: m.read,
    createdAt: m.createdAt.toISOString(),
    fromUsername: m.fromUsername ?? "Staff",
    fromAvatar: m.fromAvatar,
    fromDiscordId: m.fromDiscordId ?? null,
  }));

  return (
    <div className="py-4 space-y-4 lg:py-6 lg:space-y-6">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">Inbox</h1>
        <p className="text-sm text-muted-foreground">
          {messages.filter((m) => !m.read).length > 0
            ? `${messages.filter((m) => !m.read).length} message${messages.filter((m) => !m.read).length > 1 ? "s" : ""} non lu${messages.filter((m) => !m.read).length > 1 ? "s" : ""}`
            : "Tous les messages sont lus"}
        </p>
      </div>

      <InboxList messages={messages} />
    </div>
  );
}
