import { auth } from "@/lib/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export default auth((req: NextRequest & { auth: any | null }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isAuthenticated = !!session;

  console.log("Middleware:", pathname, "Auth:", isAuthenticated);

  const publicPaths = ["/login", "/register", "/profile", "/profile/detail", "/", "/favicon.ico"];

  const isPublicPath = publicPaths.some((path) => pathname === path || pathname.startsWith(path + "/")) || pathname.startsWith("/_next/") || pathname.startsWith("/api/") || pathname.includes(".");

  // Jika belum login + bukan public path → redirect ke login
  if (!isAuthenticated && !isPublicPath) {
    console.log("❌ Blocked by middleware - redirecting to login");
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Jika sudah login + akses login/register → redirect ke profile
  if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/profile", req.url));
  }

  console.log("✅ Request allowed");
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
