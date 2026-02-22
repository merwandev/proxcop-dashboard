import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const ADMIN_ROLES = ["staff", "dev"];

interface AuthResult {
  userId: string;
  role: string;
}

/**
 * Check if a role has admin-level access.
 */
export function isAdminRole(role: string | undefined | null): boolean {
  return ADMIN_ROLES.includes(role ?? "");
}

/**
 * Require authentication for an API route.
 * Returns the userId and role, or a 401 NextResponse.
 */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }
  return { userId: session.user.id, role: session.user.role ?? "member" };
}

/**
 * Require admin role (staff or dev) for an API route.
 * Returns the userId and role, or a 401/403 NextResponse.
 */
export async function requireStaff(): Promise<AuthResult | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (!isAdminRole(result.role)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }
  return result;
}
