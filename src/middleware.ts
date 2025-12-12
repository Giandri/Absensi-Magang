import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const isAuthenticated = !!token;
    const { pathname } = req.nextUrl;

    // console.log("Middleware:", pathname, "Auth:", isAuthenticated);

    const publicPaths = ["/login", "/register", "/profile", "/profile/detail", "/", "/favicon.ico"];

    const isPublicPath = publicPaths.some((path) => pathname === path || pathname.startsWith(path + "/")) || pathname.startsWith("/_next/") || pathname.startsWith("/api/") || pathname.includes(".");

    if (!isAuthenticated && !isPublicPath) {
        // console.log("❌ Blocked by middleware - redirecting to login");
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
        return NextResponse.redirect(new URL("/profile", req.url));
    }

    // console.log("✅ Request allowed");
    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
