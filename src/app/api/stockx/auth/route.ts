import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Initiates the StockX OAuth2 flow.
 * Only needs to be called ONCE by the admin to get initial tokens.
 *
 * Visit: /api/stockx/auth → redirects to StockX login
 */
export async function GET() {
  // Only allow authenticated users (admin)
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const clientId = process.env.STOCKX_CLIENT_ID;
  const callbackUrl = process.env.STOCKX_FALLBACK_URL;

  if (!clientId || !callbackUrl) {
    return NextResponse.json(
      { error: "STOCKX_CLIENT_ID ou STOCKX_FALLBACK_URL manquant" },
      { status: 500 }
    );
  }

  // Generate a random state for CSRF protection
  const state = crypto.randomUUID();

  const authorizeUrl = new URL("https://accounts.stockx.com/authorize");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizeUrl.searchParams.set("scope", "offline_access openid");
  authorizeUrl.searchParams.set("audience", "gateway.stockx.com");
  authorizeUrl.searchParams.set("state", state);

  return NextResponse.redirect(authorizeUrl.toString());
}
