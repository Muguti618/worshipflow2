/** Build public site origin from request headers (Vercel / proxies). */
export function appOriginFromRequest(request: Request): string {
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "http";
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("host") ??
    "localhost:3000";
  return `${proto}://${host}`;
}
