/**
 * Vercel runs middleware on the Edge runtime.
 * Keep this file dependency-free so builds don't fail on unsupported modules.
 *
 * Auth gating still happens inside the app (e.g. `DashboardAuthGate`).
 */
import { NextResponse, type NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image optimization.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
