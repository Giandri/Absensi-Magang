import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const isAuthenticated = !!token;
    const { pathname } = req.nextUrl;


    const publicPaths = ["/login", "/register", "/profile", "/profile/detail", "/", "/favicon.ico"];

    const isPublicPath = publicPaths.some((path) => pathname === path || pathname.startsWith(path + "/")) || pathname.startsWith("/_next/") || pathname.startsWith("/api/") || pathname.includes(".");

    // Special handling for dashboard routes
    if (pathname.startsWith("/dashboard")) {
        console.log("🔍 Dashboard access check - Auth:", isAuthenticated, "Role:", token?.role, "Path:", pathname);
        if (!isAuthenticated) {
            console.log("❌ Dashboard access blocked - not authenticated");
            const loginUrl = new URL("/login", req.url);
            loginUrl.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(loginUrl);
        }

        // More robust role checking
        const userRole = token?.role;
        const isAdmin = userRole === "admin";

        if (!isAdmin) {
            console.log("❌ Dashboard access blocked - not admin, role:", userRole, "pathname:", pathname);
            // Redirect non-admin users to profile
            return NextResponse.redirect(new URL("/profile", req.url));
        }

        console.log("✅ Dashboard access allowed for admin, role:", userRole);
        return NextResponse.next();
    }

    if (!isAuthenticated && !isPublicPath) {
        // console.log("❌ General access blocked - not authenticated, redirecting to login");
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
        // Admin users should go to dashboard, others to profile
        const redirectUrl = token?.role === "admin" ? "/dashboard" : "/profile";
        // console.log("🔄 Authenticated user accessing login/register, redirecting to:", redirectUrl);
        return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    // Admin users cannot access home page, always redirect to dashboard
    if (isAuthenticated && token?.role === "admin" && pathname === "/") {
        // console.log("🔄 Admin accessing home page, redirecting to dashboard");
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }



    // console.log("✅ Request allowed");
    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.).*)',
    ],
};
