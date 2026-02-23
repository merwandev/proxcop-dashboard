import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth-utils";

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
}

export async function GET() {
  const authResult = await requireStaff();
  if (authResult instanceof NextResponse) return authResult;

  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    return NextResponse.json(
      { error: "DISCORD_BOT_TOKEN ou DISCORD_GUILD_ID non configure" },
      { status: 500 }
    );
  }

  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Impossible de recuperer les roles Discord" },
      { status: 502 }
    );
  }

  const roles: DiscordRole[] = await res.json();

  // Filter out @everyone and bot-managed roles, sort by position desc
  const filtered = roles
    .filter((r) => r.name !== "@everyone" && !r.managed)
    .sort((a, b) => b.position - a.position)
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: `#${r.color.toString(16).padStart(6, "0")}`,
    }));

  return NextResponse.json(filtered);
}
