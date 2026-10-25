import { NextResponse, type NextRequest } from "next/server";
import { overCapacity } from "@/lib/shed";

/**
 * Keeps the instance alive under a traffic spike: if the public request rate
 * exceeds MAX_PUBLIC_RPS, extra requests receive a fast 503 + Retry-After
 * instead of exhausting memory and taking the whole site down.
 * /admin and /api/admin are never rate-limited.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdmin = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (!isAdmin && overCapacity()) {
    return new NextResponse(
      `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>الخدمة مشغولة</title>
<style>body{font-family:system-ui,Tahoma,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f9fafb;color:#1f2937}
.c{text-align:center;padding:2rem;border:1px solid #e5e7eb;border-radius:1rem;max-width:30rem;background:#fff}</style></head>
<body><div class="c"><h1 style="margin:0 0 .5rem">الخدمة مشغولة الآن</h1>
<p style="color:#4b5563;margin:.25rem 0 1rem">Service busy — please retry in a moment.</p>
<a href="/" style="color:#16a34a;font-weight:700">تحديث / Retry</a></div></body></html>`,
      { status: 503, headers: { "Retry-After": "2", "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
