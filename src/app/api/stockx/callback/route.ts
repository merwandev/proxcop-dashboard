import { db } from "@/lib/db";
import { stockxTokens } from "@/lib/db/schema";
import { NextRequest, NextResponse } from "next/server";

/**
 * OAuth2 callback from StockX.
 * Exchanges the authorization code for access + refresh tokens.
 * Stores tokens in DB for future API calls.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.json(
      { error: `StockX OAuth error: ${error}` },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: "Code d'autorisation manquant" },
      { status: 400 }
    );
  }

  const clientId = process.env.STOCKX_CLIENT_ID!;
  const clientSecret = process.env.STOCKX_CLIENT_SECRET!;
  const callbackUrl = process.env.STOCKX_FALLBACK_URL!;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://accounts.stockx.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl,
      }),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.text();
      return NextResponse.json(
        { error: "Erreur echange token StockX", details: errData },
        { status: 500 }
      );
    }

    const data = await tokenRes.json();

    const accessToken = data.access_token as string;
    const refreshToken = data.refresh_token as string;
    const expiresIn = data.expires_in as number; // seconds
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Delete any existing tokens and insert new ones
    await db.delete(stockxTokens);
    await db.insert(stockxTokens).values({
      accessToken,
      refreshToken,
      expiresAt,
    });

    // Redirect to dashboard with success
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(
      `${appUrl}/dashboard?stockx=connected`
    );
  } catch (e) {
    return NextResponse.json(
      { error: "Erreur inattendue", details: (e as Error).message },
      { status: 500 }
    );
  }
}
