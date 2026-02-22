import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      discordId: string;
      discordUsername: string;
      discordAvatar?: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: string;
    discordId?: string;
    discordUsername?: string;
    discordAvatar?: string | null;
  }
}
