import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface DiscordGuild {
  id: string;
  name: string;
  owner: boolean;
  permissions: string;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "identify email guilds",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (!account || !profile) return false;

      // Verify user is in the Proxcop Discord server
      try {
        const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
          },
        });

        if (!guildsResponse.ok) return false;

        const guilds: DiscordGuild[] = await guildsResponse.json();
        const isInGuild = guilds.some(
          (guild) => guild.id === process.env.DISCORD_GUILD_ID
        );

        if (!isInGuild) return false;

        // Check if user is guild owner or has ADMINISTRATOR permission (0x8)
        const proxcopGuild = guilds.find(
          (guild) => guild.id === process.env.DISCORD_GUILD_ID
        )!;
        const permissions = BigInt(proxcopGuild.permissions);
        const isAdmin = proxcopGuild.owner || (permissions & BigInt(0x8)) !== BigInt(0);
        const detectedRole = isAdmin ? "staff" : "member";

        // Upsert user in database
        const discordId = profile.id as string;
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.discordId, discordId))
          .limit(1);

        if (existingUser.length === 0) {
          await db.insert(users).values({
            discordId,
            discordUsername: profile.username as string,
            discordAvatar: profile.image_url as string | undefined,
            email: profile.email as string | undefined,
            role: detectedRole,
          });
        } else {
          await db
            .update(users)
            .set({
              discordUsername: profile.username as string,
              discordAvatar: profile.image_url as string | undefined,
              email: profile.email as string | undefined,
              role: detectedRole,
              updatedAt: new Date(),
            })
            .where(eq(users.discordId, discordId));
        }

        return true;
      } catch {
        return false;
      }
    },
    async jwt({ token, profile }) {
      if (profile) {
        const discordId = profile.id as string;
        const dbUser = await db
          .select()
          .from(users)
          .where(eq(users.discordId, discordId))
          .limit(1);

        if (dbUser[0]) {
          token.userId = dbUser[0].id;
          token.role = dbUser[0].role;
          token.discordId = discordId;
          token.discordUsername = dbUser[0].discordUsername;
          token.discordAvatar = dbUser[0].discordAvatar;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.discordId = token.discordId as string;
        session.user.discordUsername = token.discordUsername as string;
        session.user.discordAvatar = token.discordAvatar as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
